import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.lead import (
    Lead,
    LeadStatus,
    LeadSource,
    LeadStatusHistory,
    NextActionType,
)
from app.models.visit import Visit
from app.models.activity import Activity, ActivityType

engine = create_async_engine(
    "postgresql+asyncpg://postgres:premvit%40200@db.iclbvtwyfboirfuvsipr.supabase.co:5432/postgres",
    echo=False
)

Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

now = datetime.now(timezone.utc)
ago = lambda **kw: now - timedelta(**kw)
ahead = lambda **kw: now + timedelta(**kw)


async def seed():
    async with Session() as db:

        # ── Users ─────────────────────────
        users = [
            User(
                id="u1",
                name="Aarav Sharma",
                email="aarav@pgcrm.dev",
                hashed_password=hash_password("Admin@123"),
                role=UserRole.admin,
                avatar_color="bg-stage-new",
            ),
            User(
                id="u2",
                name="Priya Patel",
                email="priya@pgcrm.dev",
                hashed_password=hash_password("Agent@123"),
                role=UserRole.agent,
                avatar_color="bg-stage-contacted",
            ),
        ]

        db.add_all(users)
        await db.flush()

        # ── Leads ─────────────────────────
        leads = [
            Lead(
                id="l1",
                name="Karthik Reddy",
                phone="+91 98765 43210",
                email="karthik@example.com",
                source=LeadSource.phone_call,  # ✅ FIXED
                status=LeadStatus.new,
                assigned_to="u2",
                score=72,
                budget=12000,
                preferred_location="HSR Layout",
                last_activity_at=ago(hours=2),
                created_at=ago(hours=6),
                next_action=NextActionType.call,  # ✅ FIXED
                next_action_due=ahead(hours=3),
            ),
            Lead(
                id="l2",
                name="Ananya Singh",
                phone="+91 99887 12345",
                email="ananya@example.com",
                source=LeadSource.referral,  # ✅ FIXED
                status=LeadStatus.contacted,
                assigned_to="u2",
                score=84,
                budget=18000,
                preferred_location="Indiranagar",
                last_activity_at=ago(hours=8),
                created_at=ago(days=3),
            ),
        ]

        db.add_all(leads)
        await db.flush()

        # ── Status History ────────────────
        for lead in leads:
            db.add(
                LeadStatusHistory(
                    lead_id=lead.id,
                    old_status=None,
                    new_status=lead.status,
                    changed_by="u1",
                    changed_at=lead.created_at,
                )
            )

        # ── Visits ────────────────────────
        visits = [
            Visit(
                id="v1",
                lead_id="l1",
                scheduled_at=ahead(hours=5),
                notes="Initial visit",
            )
        ]

        db.add_all(visits)

        # ── Activities ───────────────────
        for lead in leads:
            db.add(
                Activity(
                    lead_id=lead.id,
                    type=ActivityType.lead_created,  # ✅ use enum directly
                    message=f"Lead {lead.name} was created",
                    actor_id="u1",
                    created_at=lead.created_at,
                )
            )

        await db.commit()

        print("✅ Seed complete!")
        print("\n🔑 Login credentials:")
        print("Admin: aarav@pgcrm.dev / Admin@123")
        print("Agent: priya@pgcrm.dev / Agent@123")


if __name__ == "__main__":
    asyncio.run(seed())