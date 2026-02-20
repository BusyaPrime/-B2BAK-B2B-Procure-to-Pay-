from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import DealStatus, InvoiceStatus, QuoteStatus, RequestStatus, Role


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    request_id: str | None = None


class LoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email_like(cls, value: str) -> str:
        v = value.strip().lower()
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v


class RegisterPayload(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    org_name: str = Field(min_length=2, max_length=120)
    role: Literal["BUYER", "VENDOR", "VIEWER"]

    @field_validator("email")
    @classmethod
    def validate_register_email(cls, value: str) -> str:
        v = value.strip().lower()
        if "@" not in v or v.startswith("@") or v.endswith("@"):
            raise ValueError("Invalid email format")
        return v

    @field_validator("org_name")
    @classmethod
    def validate_org_name(cls, value: str) -> str:
        v = value.strip()
        if len(v) < 2:
            raise ValueError("Organization name is too short")
        return v


class OAuthStartOut(BaseModel):
    authorize_url: str


class OAuthExchangePayload(BaseModel):
    code: str = Field(min_length=10, max_length=4096)
    state: str = Field(min_length=8, max_length=256)


class OAuthExchangeOut(BaseModel):
    status: Literal["authenticated", "needs_verification"]
    verify_token: str | None = None
    email: str | None = None
    provider: Literal["google", "github"] | None = None
    user: Any | None = None


class OAuthCompleteRegistrationPayload(BaseModel):
    verify_token: str = Field(min_length=20, max_length=4096)
    role: Literal["BUYER", "VENDOR", "VIEWER"]


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    org_id: uuid.UUID
    email: str
    role: Role
    display_name: str | None = None
    avatar_url: str | None = None
    theme_preference: Literal["dark", "light"] = "dark"
    locale: Literal["en", "ru"] = "en"
    created_at: datetime


class MeOut(BaseModel):
    user: UserOut
    organization: OrganizationOut


class ProfileUpdatePayload(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = None
    theme_preference: Literal["dark", "light"] | None = None
    locale: Literal["en", "ru"] | None = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip()
        if len(v) == 0:
            return None
        return v

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        v = value.strip()
        if len(v) == 0:
            return None
        if len(v) > 1_500_000:
            raise ValueError("Avatar payload is too large")
        if not (v.startswith("data:image/") or v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Avatar must be an image URL or image data URL")
        return v


class Paginated(BaseModel):
    items: list[Any]
    page: int
    page_size: int
    total: int


class RequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=10)
    budget_cents: int = Field(gt=0)
    currency: str = "USD"
    deadline_date: date
    tags: list[str] = Field(default_factory=list)


class RequestPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    budget_cents: int | None = None
    deadline_date: date | None = None
    tags: list[str] | None = None


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    buyer_org_id: uuid.UUID
    title: str
    description: str
    budget_cents: int
    currency: str
    deadline_date: date
    tags: list[str]
    status: RequestStatus
    created_at: datetime
    updated_at: datetime


class QuoteCreate(BaseModel):
    request_id: uuid.UUID
    amount_cents: int = Field(gt=0)
    timeline_days: int = Field(gt=0)
    terms: str = Field(min_length=5)


class QuotePatch(BaseModel):
    amount_cents: int | None = None
    timeline_days: int | None = None
    terms: str | None = None


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    request_id: uuid.UUID
    vendor_org_id: uuid.UUID
    amount_cents: int
    timeline_days: int
    terms: str
    status: QuoteStatus
    created_at: datetime
    updated_at: datetime


class AwardPayload(BaseModel):
    winning_quote_id: uuid.UUID


class DealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    buyer_org_id: uuid.UUID
    vendor_org_id: uuid.UUID
    request_id: uuid.UUID
    winning_quote_id: uuid.UUID | None
    status: DealStatus
    created_at: datetime
    updated_at: datetime


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deal_id: uuid.UUID
    amount_cents: int
    currency: str
    status: InvoiceStatus
    issued_at: datetime | None
    paid_at: datetime | None


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    deal_id: uuid.UUID
    sender_user_id: uuid.UUID
    body: str
    created_at: datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    org_id: uuid.UUID
    actor_user_id: uuid.UUID | None
    action: str
    entity: str
    entity_id: str
    payload: dict[str, Any]
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    org_id: uuid.UUID
    user_id: uuid.UUID
    type: str
    payload: dict[str, Any]
    read_at: datetime | None
    created_at: datetime


class InviteCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: Role = Role.VIEWER


class InviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    org_id: uuid.UUID
    email: str
    role: Role
    status: str
    created_by_user_id: uuid.UUID
    created_at: datetime


class SuggestionPrompt(BaseModel):
    context_type: str = "request"
    context_id: str
    prompt: str = Field(min_length=2, max_length=1200)


class SuggestionOut(BaseModel):
    title: str
    suggestions: list[str]
    disclaimer: str
