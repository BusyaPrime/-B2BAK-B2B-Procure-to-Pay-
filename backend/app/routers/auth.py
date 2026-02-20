import secrets
from datetime import timedelta
from uuid import UUID

import httpx
from fastapi import APIRouter, Cookie, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from urllib.parse import urlencode

from app.config import get_settings
from app.deps import clear_auth_cookies, get_current_org, get_current_user, get_db, get_redis, set_auth_cookies
from app.exceptions import AppError
from app.models import BuyerProfile, Organization, Role, User, VendorProfile
from app.schemas import (
    LoginPayload,
    MeOut,
    ProfileUpdatePayload,
    RegisterPayload,
    OAuthCompleteRegistrationPayload,
    OAuthExchangeOut,
    OAuthExchangePayload,
    OAuthStartOut,
    UserOut,
)
from app.security import create_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
OAUTH_PROVIDER_GOOGLE = "google"
OAUTH_PROVIDER_GITHUB = "github"


def _rate_limit(redis_client, key: str, limit: int = 10, window_seconds: int = 60) -> None:
    current = redis_client.incr(key)
    if current == 1:
        redis_client.expire(key, window_seconds)
    if int(current) > limit:
        raise AppError(429, "Too Many Requests", "Rate limit exceeded")


def _provider_exists(provider: str) -> bool:
    return provider in {OAUTH_PROVIDER_GOOGLE, OAUTH_PROVIDER_GITHUB}


def _oauth_redirect_uri(provider: str) -> str:
    settings = get_settings()
    return f"{settings.frontend_origin.rstrip('/')}/oauth/{provider}"


def _build_authorize_url(provider: str, state: str) -> str:
    settings = get_settings()
    redirect_uri = _oauth_redirect_uri(provider)
    if provider == OAUTH_PROVIDER_GOOGLE:
        if not settings.google_client_id or not settings.google_client_secret:
            raise AppError(503, "Service Unavailable", "Google OAuth is not configured")
        query = urlencode(
            {
                "client_id": settings.google_client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
            }
        )
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    if provider == OAUTH_PROVIDER_GITHUB:
        if not settings.github_client_id or not settings.github_client_secret:
            raise AppError(503, "Service Unavailable", "GitHub OAuth is not configured")
        query = urlencode(
            {
                "client_id": settings.github_client_id,
                "redirect_uri": redirect_uri,
                "scope": "read:user user:email",
                "state": state,
            }
        )
        return f"https://github.com/login/oauth/authorize?{query}"
    raise AppError(400, "Bad Request", "Unsupported provider")


def _oauth_exchange_google(code: str) -> tuple[str, str | None]:
    settings = get_settings()
    redirect_uri = _oauth_redirect_uri(OAUTH_PROVIDER_GOOGLE)
    with httpx.Client(timeout=12) as client:
        token_res = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        if token_res.status_code >= 400:
            raise AppError(401, "Unauthorized", "Google token exchange failed")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise AppError(401, "Unauthorized", "Google token exchange failed")
        profile_res = client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code >= 400:
            raise AppError(401, "Unauthorized", "Google profile request failed")
        data = profile_res.json()
    email = str(data.get("email", "")).strip().lower()
    if not email or "@" not in email:
        raise AppError(400, "Bad Request", "Google account does not provide a valid email")
    subject = data.get("sub")
    return email, str(subject) if subject else None


def _oauth_exchange_github(code: str) -> tuple[str, str | None]:
    settings = get_settings()
    redirect_uri = _oauth_redirect_uri(OAUTH_PROVIDER_GITHUB)
    with httpx.Client(timeout=12) as client:
        token_res = client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code >= 400:
            raise AppError(401, "Unauthorized", "GitHub token exchange failed")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise AppError(401, "Unauthorized", "GitHub token exchange failed")
        user_res = client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        if user_res.status_code >= 400:
            raise AppError(401, "Unauthorized", "GitHub profile request failed")
        user_data = user_res.json()
        email = str(user_data.get("email", "")).strip().lower()
        if not email:
            emails_res = client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            )
            if emails_res.status_code >= 400:
                raise AppError(401, "Unauthorized", "GitHub email request failed")
            emails = emails_res.json()
            primary = next(
                (
                    item.get("email")
                    for item in emails
                    if isinstance(item, dict) and item.get("verified") and item.get("primary")
                ),
                None,
            )
            fallback = next((item.get("email") for item in emails if isinstance(item, dict)), None)
            email = str(primary or fallback or "").strip().lower()
    if not email or "@" not in email:
        raise AppError(400, "Bad Request", "GitHub account does not provide a valid email")
    subject = user_data.get("id")
    return email, str(subject) if subject else None


def _exchange_provider_code(provider: str, code: str) -> tuple[str, str | None]:
    if provider == OAUTH_PROVIDER_GOOGLE:
        return _oauth_exchange_google(code)
    if provider == OAUTH_PROVIDER_GITHUB:
        return _oauth_exchange_github(code)
    raise AppError(400, "Bad Request", "Unsupported provider")


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    redis_client = get_redis()
    _rate_limit(redis_client, f"rl:login:{request.client.host if request.client else 'unknown'}")
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppError(401, "Unauthorized", "Invalid credentials")
    set_auth_cookies(response, user.id)
    return user


@router.post("/register", response_model=UserOut)
def register(
    payload: RegisterPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    redis_client = get_redis()
    _rate_limit(redis_client, f"rl:register:{request.client.host if request.client else 'unknown'}", limit=10)
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise AppError(409, "Conflict", "User with this email already exists")

    role = Role[payload.role]
    org = Organization(name=payload.org_name)
    db.add(org)
    db.flush()
    user = User(
        org_id=org.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.flush()
    if role == Role.BUYER:
        db.add(BuyerProfile(org_id=org.id, departments=["Procurement"]))
    if role == Role.VENDOR:
        db.add(VendorProfile(org_id=org.id, company_name=payload.org_name, industries=[], regions=[]))
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, user.id)
    return user


@router.get("/oauth/{provider}/start", response_model=OAuthStartOut)
def oauth_start(
    provider: str,
    intent: str = Query(default="login", pattern="^(login|register)$"),
) -> OAuthStartOut:
    if not _provider_exists(provider):
        raise AppError(400, "Bad Request", "Unsupported provider")
    redis_client = get_redis()
    settings = get_settings()
    state = secrets.token_urlsafe(32)
    redis_client.setex(f"oauth:state:{state}", settings.oauth_state_ttl_seconds, intent)
    return OAuthStartOut(authorize_url=_build_authorize_url(provider, state))


@router.post("/oauth/{provider}/exchange", response_model=OAuthExchangeOut)
def oauth_exchange(
    provider: str,
    payload: OAuthExchangePayload,
    response: Response,
    db: Session = Depends(get_db),
) -> OAuthExchangeOut:
    if not _provider_exists(provider):
        raise AppError(400, "Bad Request", "Unsupported provider")
    redis_client = get_redis()
    state_key = f"oauth:state:{payload.state}"
    intent = redis_client.get(state_key)
    redis_client.delete(state_key)
    if intent is None:
        raise AppError(401, "Unauthorized", "Invalid or expired OAuth state")
    email, provider_subject = _exchange_provider_code(provider, payload.code)
    user = db.scalar(select(User).where(User.email == email))
    if user is not None:
        set_auth_cookies(response, user.id)
        return OAuthExchangeOut(status="authenticated", user=UserOut.model_validate(user))
    settings = get_settings()
    one_time_nonce = secrets.token_urlsafe(24)
    redis_client.setex(
        f"oauth:verify:{one_time_nonce}",
        settings.oauth_register_expires_minutes * 60,
        f"{provider}|{email}|{provider_subject or ''}|{intent}",
    )
    signed_token = create_token(
        one_time_nonce,
        "oauth_register",
        timedelta(minutes=settings.oauth_register_expires_minutes),
    )
    return OAuthExchangeOut(
        status="needs_verification",
        verify_token=signed_token,
        email=email,
        provider=provider,
    )


@router.post("/oauth/complete-registration", response_model=UserOut)
def oauth_complete_registration(
    payload: OAuthCompleteRegistrationPayload,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    try:
        token = decode_token(payload.verify_token)
    except ValueError as exc:
        raise AppError(401, "Unauthorized", "Invalid verification token") from exc
    if token.get("type") != "oauth_register":
        raise AppError(401, "Unauthorized", "Invalid verification token")
    nonce = str(token.get("sub", ""))
    if not nonce:
        raise AppError(401, "Unauthorized", "Invalid verification token")
    redis_client = get_redis()
    value = redis_client.get(f"oauth:verify:{nonce}")
    redis_client.delete(f"oauth:verify:{nonce}")
    if value is None:
        raise AppError(401, "Unauthorized", "Expired verification token")
    parts = value.split("|", maxsplit=3)
    if len(parts) != 4:
        raise AppError(401, "Unauthorized", "Invalid verification token")
    _, email, _, _ = parts
    role = Role[payload.role]
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        set_auth_cookies(response, existing.id)
        return existing
    org_name = f"{email.split('@', maxsplit=1)[0].replace('.', ' ').replace('_', ' ').title()} Workspace"
    org = Organization(name=org_name)
    db.add(org)
    db.flush()
    user = User(
        org_id=org.id,
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(48)),
        role=role,
    )
    db.add(user)
    db.flush()
    if role == Role.BUYER:
        db.add(BuyerProfile(org_id=org.id, departments=["Procurement"]))
    if role == Role.VENDOR:
        db.add(VendorProfile(org_id=org.id, company_name=f"{email.split('@', maxsplit=1)[0]} Ltd", industries=[], regions=[]))
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, user.id)
    return user


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    clear_auth_cookies(response)
    return {"message": "logged_out"}


@router.post("/refresh")
def refresh(
    request: Request,
    response: Response,
    b2bak_refresh: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    redis_client = get_redis()
    _rate_limit(redis_client, f"rl:refresh:{request.client.host if request.client else 'unknown'}", limit=20)
    if b2bak_refresh is None:
        raise AppError(401, "Unauthorized", "Missing refresh token")
    try:
        token = decode_token(b2bak_refresh)
    except ValueError as exc:
        raise AppError(401, "Unauthorized", "Invalid refresh token") from exc
    if token.get("type") != "refresh":
        raise AppError(401, "Unauthorized", "Invalid refresh token")
    user = db.get(User, UUID(token["sub"]))
    if not user:
        raise AppError(401, "Unauthorized", "Invalid refresh token")
    set_auth_cookies(response, user.id)
    return {"message": "refreshed"}


@router.get("/me", response_model=MeOut)
def me(
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
) -> MeOut:
    return MeOut(user=user, organization=org)


@router.get("/profile", response_model=UserOut)
def profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdatePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.theme_preference is not None:
        user.theme_preference = payload.theme_preference
    if payload.locale is not None:
        user.locale = payload.locale
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
