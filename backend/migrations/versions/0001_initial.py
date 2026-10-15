"""Initial workspace-scoped data model.

Revision ID: 0001_initial
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

uuid_type = sa.Uuid(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"], unique=True)

    op.create_table(
        "teams",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "name", name="uq_team_workspace_name"),
    )
    op.create_index("ix_teams_workspace_id", "teams", ["workspace_id"])

    op.create_table(
        "work_items",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", uuid_type, sa.ForeignKey("teams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("key", sa.String(32), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(60), nullable=False, server_default="Open"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="Medium"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_subject", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "key", name="uq_work_item_workspace_key"),
    )
    op.create_index("ix_work_items_workspace_id", "work_items", ["workspace_id"])
    op.create_index("ix_work_items_team_id", "work_items", ["team_id"])
    op.create_index("ix_work_items_workspace_status", "work_items", ["workspace_id", "status"])
    op.create_index("ix_work_items_workspace_due_at", "work_items", ["workspace_id", "due_at"])

    op.create_table(
        "workflow_options",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_key", sa.String(80), nullable=False),
        sa.Column("value", sa.String(120), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "field_key", "value", name="uq_workflow_option_value"),
    )
    op.create_index("ix_workflow_options_workspace_id", "workflow_options", ["workspace_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_subject", sa.String(255), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_workspace_id", "audit_events", ["workspace_id"])
    op.create_index("ix_audit_workspace_created", "audit_events", ["workspace_id", "created_at"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("workflow_options")
    op.drop_table("work_items")
    op.drop_table("teams")
    op.drop_table("workspaces")
