from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.visit import Visit
from app.models.lead import Lead, LeadStatus, NextActionType
from app.models.activity import ActivityType
from app.services.activity_service import log_activity


async def create_visit(
    db: AsyncSession,
    lead_id: str,
    scheduled_at: datetime,
    notes: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> Visit:
    # Validate lead exists
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=404, detail="Lead not found")

    visit = Visit(lead_id=lead_id, scheduled_at=scheduled_at, notes=notes)
    db.add(visit)

    # Auto-move lead to Visit Scheduled if not already closed
    if lead.status not in (LeadStatus.closed, LeadStatus.visit_scheduled):
        lead.status = LeadStatus.visit_scheduled

    # Update next action on the lead
    lead.next_action = NextActionType.visit
    lead.next_action_due = scheduled_at
    lead.next_action_note = notes
    lead.updated_at = datetime.now(timezone.utc)

    await log_activity(
        db, lead_id, ActivityType.visit_scheduled,
        f"Visit scheduled for {scheduled_at.strftime('%d %b %Y, %H:%M')}",
        actor_id=actor_id,
    )

    return visit


async def list_visits(
    db: AsyncSession,
    lead_id: Optional[str] = None,
    upcoming_only: bool = False,
) -> List[Visit]:
    q = select(Visit).options(selectinload(Visit.lead))
    if lead_id:
        q = q.where(Visit.lead_id == lead_id)
    if upcoming_only:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        q = q.where(Visit.scheduled_at >= cutoff)
    q = q.order_by(Visit.scheduled_at.asc())
    result = await db.execute(q)
    return list(result.scalars().all())
