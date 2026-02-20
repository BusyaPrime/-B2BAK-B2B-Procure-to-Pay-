from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, Integer, String, Text, UUID, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class Role(str, enum.Enum):
    ORG_OWNER = "ORG_OWNER"
    ADMIN = "ADMIN"
    BUYER = "BUYER"
    VENDOR = "VENDOR"
    VIEWER = "VIEWER"


class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    QUOTING = "QUOTING"
    SHORTLIST = "SHORTLIST"
    AWARDED = "AWARDED"
    CLOSED = "CLOSED"


class QuoteStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UPDATED = "UPDATED"
    WITHDRAWN = "WITHDRAWN"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class DealStatus(str, enum.Enum):
    NEGOTIATION = "NEGOTIATION"
    CONTRACT = "CONTRACT"
    INVOICED = "INVOICED"
    PAID = "PAID"
    ARCHIVED = "ARCHIVED"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    VOID = "VOID"


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role, name="role_enum"), default=Role.VIEWER)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    theme_preference: Mapped[str] = mapped_column(String(10), default="dark")
    locale: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class VendorProfile(Base):
    __tablename__ = "vendor_profiles"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    industries: Mapped[list[str]] = mapped_column(JSON, default=list)
    regions: Mapped[list[str]] = mapped_column(JSON, default=list)
    sla_level: Mapped[str] = mapped_column(String(50), default="STANDARD")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    departments: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Listing(Base):
    __tablename__ = "listings"
    id: Mapped[uuid.UUID] = uuid_pk()
    vendor_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    pricing_model: Mapped[str] = mapped_column(String(100))
    min_budget_cents: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Request(Base):
    __tablename__ = "requests"
    id: Mapped[uuid.UUID] = uuid_pk()
    buyer_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    budget_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    deadline_date: Mapped[date] = mapped_column(Date)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus, name="request_status_enum"), default=RequestStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    quotes: Mapped[list[Quote]] = relationship(back_populates="request")


class Quote(Base):
    __tablename__ = "quotes"
    id: Mapped[uuid.UUID] = uuid_pk()
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id"), index=True)
    vendor_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    timeline_days: Mapped[int] = mapped_column(Integer)
    terms: Mapped[str] = mapped_column(Text)
    status: Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus, name="quote_status_enum"), default=QuoteStatus.SUBMITTED)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    request: Mapped[Request] = relationship(back_populates="quotes")


class Deal(Base):
    __tablename__ = "deals"
    id: Mapped[uuid.UUID] = uuid_pk()
    buyer_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    vendor_org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requests.id"), index=True)
    winning_quote_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("quotes.id"), nullable=True)
    status: Mapped[DealStatus] = mapped_column(Enum(DealStatus, name="deal_status_enum"), default=DealStatus.NEGOTIATION)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[uuid.UUID] = uuid_pk()
    deal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deals.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus, name="invoice_status_enum"), default=InvoiceStatus.DRAFT)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = uuid_pk()
    deal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deals.id"), index=True)
    sender_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class Invite(Base):
    __tablename__ = "invites"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[Role] = mapped_column(Enum(Role, name="role_enum"), default=Role.VIEWER)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity: Mapped[str] = mapped_column(String(120), index=True)
    entity_id: Mapped[str] = mapped_column(String(120), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("org_id", "key", "endpoint", name="uq_idempotency"),)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), primary_key=True)
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(255), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
