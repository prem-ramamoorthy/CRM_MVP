from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.schemas.activity import ActivityCreate, ActivityOut
from app.services.activity_service import log_activity, get_lead_activities

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def create_activity(
    body: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually log an activity (call, message, email, etc.) for a lead."""
    # Verify lead exists
    lead = (await db.execute(select(Lead).where(Lead.id == body.lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = await log_activity(
        db,
        lead_id=body.lead_id,
        activity_type=body.type,
        message=body.message,
        actor_id=current_user.id,
        meta=body.meta,
        touch_lead=True,
    )
    await db.flush()
    return ActivityOut.model_validate(activity)


@router.get("/{lead_id}", response_model=List[ActivityOut])
async def get_activities(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get the full activity timeline for a lead."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = await get_lead_activities(db, lead_id)
    return [ActivityOut.model_validate(a) for a in activities]
