from collections.abc import Iterable
from datetime import timedelta
from uuid import UUID

from fastapi import Cookie, Depends, Request, Response
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.exceptions import AppError
from app.models import Organization, Role, User
from app.security import create_token, decode_token


def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)


def _token_cookie_name(token_type: str) -> str:
    return "b2bak_access" if token_type == "access" else "b2bak_refresh"


def set_auth_cookies(response: Response, user_id: UUID) -> None:
    settings = get_settings()
    access = create_token(str(user_id), "access", timedelta(minutes=settings.jwt_access_expires_minutes))
    refresh = create_token(str(user_id), "refresh", timedelta(days=settings.jwt_refresh_expires_days))
    response.set_cookie(
        key=_token_cookie_name("access"),
        value=access,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_access_expires_minutes * 60,
    )
    response.set_cookie(
        key=_token_cookie_name("refresh"),
        value=refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_refresh_expires_days * 24 * 60 * 60,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("b2bak_access")
    response.delete_cookie("b2bak_refresh")


def get_current_user(
    db: Session = Depends(get_db),
    access_cookie: str | None = Cookie(default=None, alias="b2bak_access"),
) -> User:
    if not access_cookie:
        raise AppError(401, "Unauthorized", "Missing auth cookie")
    try:
        token = decode_token(access_cookie)
    except ValueError as exc:
        raise AppError(401, "Unauthorized", "Invalid token") from exc
    if token.get("type") != "access":
        raise AppError(401, "Unauthorized", "Invalid token type")
    user_id = token.get("sub")
    user = db.get(User, UUID(user_id))
    if not user:
        raise AppError(401, "Unauthorized", "User does not exist")
    return user


def get_current_org(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    org = db.scalar(select(Organization).where(Organization.id == current_user.org_id))
    if not org:
        raise AppError(401, "Unauthorized", "Organization does not exist")
    return org


def require_roles(allowed: Iterable[Role]):
    allowed_set = set(allowed)

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_set:
            raise AppError(403, "Forbidden", "Insufficient role")
        return current_user

    return dependency


def request_id_from_state(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")
