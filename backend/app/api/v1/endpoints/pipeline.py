from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.lead import LeadOut, LeadStatusUpdate
from app.services import lead_service
from app.utils.sla import is_sla_breached

router = APIRouter(prefix="/leads", tags=["Pipeline"])


@router.patch("/{lead_id}/status", response_model=LeadOut)
async def update_status(
    lead_id: str,
    body: LeadStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Move a lead through the pipeline.
    - Automatically records status history.
    - Triggers next-best-action suggestion.
    - Recomputes lead score.
    """
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Agents can only move leads assigned to them
    if current_user.role.value == "agent" and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update leads assigned to you")

    lead = await lead_service.change_status(db, lead, body.status, actor_id=current_user.id)
    return LeadOut.from_orm_with_sla(lead, is_sla_breached(lead))
