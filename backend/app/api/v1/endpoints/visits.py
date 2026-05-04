from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.visit import VisitCreate, VisitOut
from app.services import visit_service

router = APIRouter(prefix="/visits", tags=["Visits"])


def _visit_out(visit) -> VisitOut:
    obj = VisitOut.model_validate(visit)
    if visit.lead:
        obj.lead_name = visit.lead.name
        obj.lead_phone = visit.lead.phone
    return obj


@router.post("", response_model=VisitOut, status_code=status.HTTP_201_CREATED)
async def create_visit(
    body: VisitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Schedule a property visit for a lead. Auto-moves lead to 'Visit Scheduled'."""
    visit = await visit_service.create_visit(
        db,
        lead_id=body.lead_id,
        scheduled_at=body.scheduled_at,
        notes=body.notes,
        actor_id=current_user.id,
    )
    await db.flush()
    return _visit_out(visit)


@router.get("", response_model=List[VisitOut])
async def list_visits(
    lead_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all visits, optionally filtered by lead."""
    visits = await visit_service.list_visits(db, lead_id=lead_id)
    return [_visit_out(v) for v in visits]


@router.get("/upcoming", response_model=List[VisitOut])
async def upcoming_visits(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get all upcoming visits (scheduled in the future ± 1h)."""
    visits = await visit_service.list_visits(db, upcoming_only=True)
    return [_visit_out(v) for v in visits]
