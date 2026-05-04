from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import math

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.lead import Lead, LeadStatus
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadOut, LeadListOut,
    LeadAssign, LeadStatusUpdate, BulkAssign, BulkStatusUpdate,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services import lead_service
from app.utils.sla import is_sla_breached

router = APIRouter(prefix="/leads", tags=["Leads"])


def _build_lead_out(lead: Lead) -> LeadListOut:
    """Convert ORM → schema with SLA flag and nested next_action."""
    from app.schemas.lead import NextActionSchema
    obj = LeadListOut.model_validate(lead)
    obj.sla_breached = is_sla_breached(lead)
    if lead.next_action:
        obj.next_action = NextActionSchema(
            type=lead.next_action,
            due_at=lead.next_action_due,
            note=lead.next_action_note,
        )
    return obj


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    body: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new lead with auto-scoring and next-best-action suggestion."""
    lead = await lead_service.create_lead(db, body, actor_id=current_user.id)
    await db.flush()
    return LeadOut.from_orm_with_sla(lead)


@router.get("", response_model=PaginatedResponse[LeadListOut])
async def list_leads(
    status: Optional[LeadStatus] = Query(None, description="Filter by status"),
    assigned_to: Optional[str] = Query(None, description="Filter by agent user id"),
    search: Optional[str] = Query(None, description="Search name, email, phone, location"),
    overdue: bool = Query(False, description="Only SLA-breached leads"),
    hot: bool = Query(False, description="Only hot leads (score ≥ 80)"),
    sort_by: str = Query("last_activity_at", description="Sort field"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List leads with advanced filters, pagination, and sorting."""
    leads, total = await lead_service.list_leads(
        db,
        status=status,
        assigned_to=assigned_to,
        search=search,
        overdue_only=overdue,
        hot_only=hot,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        current_user_role=current_user.role.value,
        current_user_id=current_user.id,
    )
    return PaginatedResponse(
        items=[_build_lead_out(l) for l in leads],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadOut.from_orm_with_sla(lead, is_sla_breached(lead))


@router.put("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: str,
    body: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Agents can only edit leads assigned to them
    if current_user.role.value == "agent" and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit leads assigned to you")

    lead = await lead_service.update_lead(db, lead, body, actor_id=current_user.id)
    return LeadOut.from_orm_with_sla(lead, is_sla_breached(lead))


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role.value == "agent":
        raise HTTPException(status_code=403, detail="Only admins can delete leads")
    await db.delete(lead)


# ── Assignment ────────────────────────────────────────────────────────────────

@router.patch("/{lead_id}/assign", response_model=LeadOut)
async def assign_lead(
    lead_id: str,
    body: LeadAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign or unassign a lead."""
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await lead_service.assign_lead(db, lead, body.user_id, actor_id=current_user.id)
    return LeadOut.from_orm_with_sla(lead, is_sla_breached(lead))


# ── Bulk operations ───────────────────────────────────────────────────────────

@router.post("/bulk/assign", response_model=MessageResponse)
async def bulk_assign(
    body: BulkAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk assign multiple leads to an agent."""
    if current_user.role.value == "agent":
        raise HTTPException(status_code=403, detail="Admin only")
    count = await lead_service.bulk_assign(db, body.lead_ids, body.user_id, actor_id=current_user.id)
    return MessageResponse(message=f"Successfully assigned {count} leads")


@router.post("/bulk/status", response_model=MessageResponse)
async def bulk_status_update(
    body: BulkStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk update status for multiple leads."""
    if current_user.role.value == "agent":
        raise HTTPException(status_code=403, detail="Admin only")
    count = await lead_service.bulk_status_update(db, body.lead_ids, body.status, actor_id=current_user.id)
    return MessageResponse(message=f"Updated status for {count} leads")
