import uuid
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    String, Integer, Float, DateTime, ForeignKey,
    Enum as SAEnum, Index, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ─────────────────────────────────────────────
# ENUMS (CRITICAL FIX: values MUST match DB)
# ─────────────────────────────────────────────

class LeadStatus(str, enum.Enum):
    new = "New"
    contacted = "Contacted"
    interested = "Interested"
    visit_scheduled = "Visit Scheduled"
    closed = "Closed"


class LeadSource(str, enum.Enum):
    website = "Website"
    referral = "Referral"
    walk_in = "Walk-in"
    social_media = "Social Media"
    phone_call = "Phone Call"
    other = "Other"


class NextActionType(str, enum.Enum):
    call = "call"
    visit = "visit"
    follow_up = "follow-up"
    send_info = "send-info"


# ─────────────────────────────────────────────
# MODEL
# ─────────────────────────────────────────────

class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)

    # ✅ FIX: force SQLAlchemy to use ENUM VALUES (not keys)
    source: Mapped[LeadSource] = mapped_column(
        SAEnum(
            LeadSource,
            values_callable=lambda x: [e.value for e in x],
            name="leadsource"
        ),
        nullable=False
    )

    status: Mapped[LeadStatus] = mapped_column(
        SAEnum(
            LeadStatus,
            values_callable=lambda x: [e.value for e in x],
            name="leadstatus"
        ),
        default=LeadStatus.new,
        nullable=False,
        index=True
    )

    score: Mapped[int] = mapped_column(Integer, default=50)
    budget: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    preferred_location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assigned_to: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # ── Next Action ──
    next_action: Mapped[Optional[NextActionType]] = mapped_column(
        SAEnum(
            NextActionType,
            values_callable=lambda x: [e.value for e in x],
            name="nextactiontype"
        ),
        nullable=True
    )

    next_action_due: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )

    next_action_note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Timestamps ──
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ─────────────────────────────────────────
    # RELATIONSHIPS
    # ─────────────────────────────────────────

    assigned_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="leads",
        foreign_keys=[assigned_to]
    )

    visits: Mapped[list["Visit"]] = relationship(
        "Visit",
        back_populates="lead",
        cascade="all, delete-orphan"
    )

    activities: Mapped[list["Activity"]] = relationship(
        "Activity",
        back_populates="lead",
        cascade="all, delete-orphan"
    )

    status_history: Mapped[list["LeadStatusHistory"]] = relationship(
        "LeadStatusHistory",
        back_populates="lead",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_leads_email", "email"),
        Index("ix_leads_phone", "phone"),
        Index("ix_leads_last_activity_at", "last_activity_at"),
    )


# ─────────────────────────────────────────────
# STATUS HISTORY
# ─────────────────────────────────────────────

class LeadStatusHistory(Base):
    __tablename__ = "lead_status_history"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    lead_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    old_status: Mapped[Optional[LeadStatus]] = mapped_column(
        SAEnum(
            LeadStatus,
            values_callable=lambda x: [e.value for e in x],
            name="leadstatus"
        ),
        nullable=True
    )

    new_status: Mapped[LeadStatus] = mapped_column(
        SAEnum(
            LeadStatus,
            values_callable=lambda x: [e.value for e in x],
            name="leadstatus"
        ),
        nullable=False
    )

    changed_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    lead: Mapped["Lead"] = relationship(
        "Lead",
        back_populates="status_history"
    )