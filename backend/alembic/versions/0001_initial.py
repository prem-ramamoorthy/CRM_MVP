"""Initial schema: users, leads, visits, activities, lead_status_history

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "agent", name="userrole"), nullable=False, server_default="agent"),
        sa.Column("avatar_color", sa.String(80), server_default="bg-stage-new"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Leads
    op.create_table(
        "leads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("source", sa.Enum("Website", "Referral", "Walk-in", "Social Media", "Phone Call", "Other", name="leadsource"), nullable=False),
        sa.Column("status", sa.Enum("New", "Contacted", "Interested", "Visit Scheduled", "Closed", name="leadstatus"), nullable=False, server_default="New"),
        sa.Column("score", sa.Integer, server_default="50"),
        sa.Column("budget", sa.Float, nullable=True),
        sa.Column("preferred_location", sa.String(150), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("assigned_to", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("next_action", sa.Enum("call", "visit", "follow-up", "send-info", name="nextactiontype"), nullable=True),
        sa.Column("next_action_due", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_action_note", sa.String(255), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index("ix_leads_assigned_to", "leads", ["assigned_to"])
    op.create_index("ix_leads_next_action_due", "leads", ["next_action_due"])
    op.create_index("ix_leads_email", "leads", ["email"])
    op.create_index("ix_leads_phone", "leads", ["phone"])
    op.create_index("ix_leads_last_activity_at", "leads", ["last_activity_at"])

    # Lead Status History
    op.create_table(
        "lead_status_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("lead_id", sa.String(36), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", sa.Enum("New", "Contacted", "Interested", "Visit Scheduled", "Closed", name="leadstatus"), nullable=True),
        sa.Column("new_status", sa.Enum("New", "Contacted", "Interested", "Visit Scheduled", "Closed", name="leadstatus"), nullable=False),
        sa.Column("changed_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_lead_status_history_lead_id", "lead_status_history", ["lead_id"])

    # Visits
    op.create_table(
        "visits",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("lead_id", sa.String(36), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_visits_lead_id", "visits", ["lead_id"])
    op.create_index("ix_visits_scheduled_at", "visits", ["scheduled_at"])

    # Activities
    op.create_table(
        "activities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("lead_id", sa.String(36), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("lead_created", "status_changed", "assigned", "visit_scheduled", "note_added", "call", "message", "email", "update", name="activitytype"), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("meta", sa.JSON, nullable=True),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_activities_lead_id", "activities", ["lead_id"])
    op.create_index("ix_activities_created_at", "activities", ["created_at"])


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("visits")
    op.drop_table("lead_status_history")
    op.drop_table("leads")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS leadsource")
    op.execute("DROP TYPE IF EXISTS leadstatus")
    op.execute("DROP TYPE IF EXISTS nextactiontype")
    op.execute("DROP TYPE IF EXISTS activitytype")
