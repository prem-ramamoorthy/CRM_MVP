from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.dashboard import MetricsOut, FunnelOut, ActivitySummaryOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=MetricsOut)
async def metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """KPI cards: total leads, today's leads & visits, conversion rate, hot leads, SLA breaches."""
    return await dashboard_service.get_metrics(db)


@router.get("/funnel", response_model=FunnelOut)
async def funnel(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lead counts and percentages across all pipeline stages."""
    return await dashboard_service.get_funnel(db)


@router.get("/activity", response_model=ActivitySummaryOut)
async def activity_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Activity breakdown and agent performance for the last 7 days."""
    return await dashboard_service.get_activity_summary(db)
