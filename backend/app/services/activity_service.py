from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.activity import Activity, ActivityType
from app.models.lead import Lead


async def log_activity(
    db: AsyncSession,
    lead_id: str,
    activity_type: ActivityType,
    message: str,
    actor_id: Optional[str] = None,
    meta: Optional[dict] = None,
    touch_lead: bool = True,
) -> Activity:
    """Create an activity log entry and optionally update lead.last_activity_at."""
    activity = Activity(
        lead_id=lead_id,
        type=activity_type,
        message=message,
        actor_id=actor_id,
        meta=meta,
        created_at=datetime.now(timezone.utc),
    )
    db.add(activity)

    if touch_lead:
        result = await db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if lead:
            lead.last_activity_at = datetime.now(timezone.utc)

    return activity


async def get_lead_activities(
    db: AsyncSession,
    lead_id: str,
    limit: int = 50,
) -> list[Activity]:
    result = await db.execute(
        select(Activity)
        .where(Activity.lead_id == lead_id)
        .order_by(desc(Activity.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())
