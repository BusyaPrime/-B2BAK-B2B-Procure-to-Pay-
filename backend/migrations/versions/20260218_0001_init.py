"""initial schema

Revision ID: 20260218_0001
Revises:
Create Date: 2026-02-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260218_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    role_enum = sa.Enum("ORG_OWNER", "ADMIN", "BUYER", "VENDOR", "VIEWER", name="role_enum")
    request_status_enum = sa.Enum("DRAFT", "PUBLISHED", "QUOTING", "SHORTLIST", "AWARDED", "CLOSED", name="request_status_enum")
    quote_status_enum = sa.Enum("SUBMITTED", "UPDATED", "WITHDRAWN", "ACCEPTED", "REJECTED", name="quote_status_enum")
    deal_status_enum = sa.Enum("NEGOTIATION", "CONTRACT", "INVOICED", "PAID", "ARCHIVED", name="deal_status_enum")
    invoice_status_enum = sa.Enum("DRAFT", "SENT", "PAID", "VOID", name="invoice_status_enum")

    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "vendor_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("industries", sa.JSON(), nullable=False),
        sa.Column("regions", sa.JSON(), nullable=False),
        sa.Column("sla_level", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "buyer_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("departments", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("pricing_model", sa.String(length=100), nullable=False),
        sa.Column("min_budget_cents", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("buyer_org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("budget_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("deadline_date", sa.Date(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("status", request_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requests.id"), index=True),
        sa.Column("vendor_org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("timeline_days", sa.Integer(), nullable=False),
        sa.Column("terms", sa.Text(), nullable=False),
        sa.Column("status", quote_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "deals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("buyer_org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("vendor_org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("requests.id"), index=True),
        sa.Column("winning_quote_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotes.id"), nullable=True),
        sa.Column("status", deal_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deals.id"), index=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("status", invoice_status_enum, nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("deal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deals.id"), index=True),
        sa.Column("sender_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), index=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), index=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity", sa.String(length=120), nullable=False),
        sa.Column("entity_id", sa.String(length=120), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "idempotency_keys",
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), primary_key=True),
        sa.Column("key", sa.String(length=120), primary_key=True),
        sa.Column("endpoint", sa.String(length=255), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("org_id", "key", "endpoint", name="uq_idempotency"),
    )


def downgrade() -> None:
    op.drop_table("idempotency_keys")
    op.drop_table("audit_log")
    op.drop_table("messages")
    op.drop_table("invoices")
    op.drop_table("deals")
    op.drop_table("quotes")
    op.drop_table("requests")
    op.drop_table("listings")
    op.drop_table("buyer_profiles")
    op.drop_table("vendor_profiles")
    op.drop_table("users")
    op.drop_table("organizations")
