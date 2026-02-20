"""add user profile preferences

Revision ID: 20260219_0003
Revises: 20260219_0002
Create Date: 2026-02-19
"""

from alembic import op
import sqlalchemy as sa

revision = "20260219_0003"
down_revision = "20260219_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("theme_preference", sa.String(length=10), nullable=False, server_default="dark"))
    op.add_column("users", sa.Column("locale", sa.String(length=5), nullable=False, server_default="en"))


def downgrade() -> None:
    op.drop_column("users", "locale")
    op.drop_column("users", "theme_preference")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "display_name")
