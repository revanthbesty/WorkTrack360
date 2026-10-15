"""Add product support workflow fields to work items.

Revision ID: 0002_support_fields
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_support_fields"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("work_items", sa.Column("product", sa.String(120), nullable=True))
    op.add_column("work_items", sa.Column("category", sa.String(120), nullable=True))
    op.add_column("work_items", sa.Column("requester", sa.String(255), nullable=True))
    op.add_column("work_items", sa.Column("owner", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("work_items", "owner")
    op.drop_column("work_items", "requester")
    op.drop_column("work_items", "category")
    op.drop_column("work_items", "product")
