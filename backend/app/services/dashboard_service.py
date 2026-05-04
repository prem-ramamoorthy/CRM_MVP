from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.models.lead import Lead, LeadStatus
from app.models.visit import Visit
from app.models.activity import Activity, ActivityType
from app.models.user import User
from app.utils.sla import is_sla_breached
from app.schemas.dashboard import MetricsOut, FunnelOut, FunnelStage, ActivitySummaryOut, AgentPerformance


async def get_metrics(db: AsyncSession) -> MetricsOut:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(Lead))).scalar_one()
    closed = (await db.execute(select(func.count()).select_from(Lead).where(Lead.status == LeadStatus.closed))).scalar_one()
    leads_today = (await db.execute(select(func.count()).select_from(Lead).where(Lead.created_at >= today_start))).scalar_one()
    visits_today = (await db.execute(
        select(func.count()).select_from(Visit)
        .where(Visit.scheduled_at >= today_start)
        .where(Visit.scheduled_at < today_start + timedelta(days=1))
    )).scalar_one()
    visits_scheduled = (await db.execute(
        select(func.count()).select_from(Lead).where(Lead.status == LeadStatus.visit_scheduled)
    )).scalar_one()
    hot_leads = (await db.execute(select(func.count()).select_from(Lead).where(Lead.score >= 80))).scalar_one()

    # SLA: fetch non-closed leads to check
    result = await db.execute(
        select(Lead).where(Lead.status.in_([LeadStatus.new, LeadStatus.contacted, LeadStatus.interested]))
    )
    active_leads = result.scalars().all()
    overdue_count = sum(1 for l in active_leads if is_sla_breached(l))

    return MetricsOut(
        total_leads=total,
        leads_today=leads_today,
        visits_today=visits_today,
        visits_scheduled=visits_scheduled,
        closed=closed,
        conversion_rate=round((closed / total * 100), 1) if total else 0.0,
        hot_leads=hot_leads,
        overdue_leads=overdue_count,
    )


async def get_funnel(db: AsyncSession) -> FunnelOut:
    rows = await db.execute(
        select(Lead.status, func.count().label("cnt")).group_by(Lead.status)
    )
    counts = {row.status: row.cnt for row in rows}
    total = sum(counts.values())

    order = [
        LeadStatus.new, LeadStatus.contacted, LeadStatus.interested,
        LeadStatus.visit_scheduled, LeadStatus.closed,
    ]
    stages = [
        FunnelStage(
            status=s.value,
            count=counts.get(s, 0),
            percentage=round(counts.get(s, 0) / total * 100, 1) if total else 0.0,
        )
        for s in order
    ]
    return FunnelOut(stages=stages, total=total)


async def get_activity_summary(db: AsyncSession) -> ActivitySummaryOut:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    total_recent = (await db.execute(
        select(func.count()).select_from(Activity).where(Activity.created_at >= since)
    )).scalar_one()

    by_type_rows = await db.execute(
        select(Activity.type, func.count().label("cnt"))
        .where(Activity.created_at >= since)
        .group_by(Activity.type)
    )
    by_type = {row.type.value: row.cnt for row in by_type_rows}

    # Agent performance
    agents = (await db.execute(select(User).where(User.role == "agent"))).scalars().all()
    perf = []
    for agent in agents:
        agent_total = (await db.execute(
            select(func.count()).select_from(Lead).where(Lead.assigned_to == agent.id)
        )).scalar_one()
        agent_closed = (await db.execute(
            select(func.count()).select_from(Lead)
            .where(Lead.assigned_to == agent.id)
            .where(Lead.status == LeadStatus.closed)
        )).scalar_one()
        perf.append(AgentPerformance(
            agent_id=agent.id,
            agent_name=agent.name,
            total=agent_total,
            closed=agent_closed,
            conversion_rate=round(agent_closed / agent_total * 100, 1) if agent_total else 0.0,
        ))

    return ActivitySummaryOut(
        recent_activity_count=total_recent,
        by_type=by_type,
        agent_performance=perf,
    )
