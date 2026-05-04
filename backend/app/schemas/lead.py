from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from app.models.lead import LeadStatus, LeadSource, NextActionType
from app.schemas.user import UserMini


# ── Next Action ────────────────────────────────────────────────
class NextActionSchema(BaseModel):
    type: NextActionType
    due_at: datetime
    note: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Lead ───────────────────────────────────────────────────────
class LeadCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    source: LeadSource
    status: LeadStatus = LeadStatus.new
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    score: int = 50
    budget: Optional[float] = None
    preferred_location: Optional[str] = None
    next_action: Optional[NextActionSchema] = None

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Phone number is required")
        return v.strip()

    @field_validator("score")
    @classmethod
    def score_range(cls, v: int) -> int:
        if not 0 <= v <= 100:
            raise ValueError("Score must be between 0 and 100")
        return v


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    source: Optional[LeadSource] = None
    status: Optional[LeadStatus] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None
    budget: Optional[float] = None
    preferred_location: Optional[str] = None
    next_action: Optional[NextActionSchema] = None


class LeadAssign(BaseModel):
    user_id: Optional[str] = None  # None = unassign


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class BulkAssign(BaseModel):
    lead_ids: List[str]
    user_id: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    lead_ids: List[str]
    status: LeadStatus


class LeadOut(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    source: LeadSource
    status: LeadStatus
    assigned_to: Optional[str]
    assigned_user: Optional[UserMini] = None
    notes: Optional[str]
    score: int
    budget: Optional[float]
    preferred_location: Optional[str]
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime

    # Next action (flattened to match frontend shape)
    next_action: Optional[NextActionSchema] = None

    # SLA flag (computed, not stored)
    sla_breached: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_sla(cls, lead, sla_breached: bool = False) -> "LeadOut":
        obj = cls.model_validate(lead)
        obj.sla_breached = sla_breached
        # Build next_action from flat columns
        if lead.next_action:
            obj.next_action = NextActionSchema(
                type=lead.next_action,
                due_at=lead.next_action_due,
                note=lead.next_action_note,
            )
        return obj


class LeadListOut(BaseModel):
    """Compact representation for table/list view."""
    id: str
    name: str
    phone: str
    email: str
    source: LeadSource
    status: LeadStatus
    assigned_to: Optional[str]
    assigned_user: Optional[UserMini] = None
    score: int
    budget: Optional[float]
    preferred_location: Optional[str]
    last_activity_at: datetime
    created_at: datetime
    next_action: Optional[NextActionSchema] = None
    sla_breached: bool = False

    model_config = {"from_attributes": True}
