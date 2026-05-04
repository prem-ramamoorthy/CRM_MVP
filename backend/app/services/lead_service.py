from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import selectinload

from app.models.lead import Lead, LeadStatus, LeadStatusHistory
from app.models.user import User
from app.models.activity import ActivityType
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut, LeadListOut
from app.services.activity_service import log_activity
from app.services.scoring_service import compute_score
from app.utils.sla import is_sla_breached
from app.utils.next_action import suggest_next_action


# ── Duplicate detection ──────────────────────────────────────────────────────

async def detect_duplicate(db: AsyncSession, email: str, phone: str, exclude_id: Optional[str] = None) -> Optional[Lead]:
    q = select(Lead).where(or_(Lead.email == email, Lead.phone == phone))
    if exclude_id:
        q = q.where(Lead.id != exclude_id)
    result = await db.execute(q.limit(1))
    return result.scalar_one_or_none()


# ── Create ───────────────────────────────────────────────────────────────────

async def create_lead(
    db: AsyncSession,
    data: LeadCreate,
    actor_id: Optional[str] = None,
) -> Lead:
    # Duplicate guard
    dup = await detect_duplicate(db, data.email, data.phone)
    if dup:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A lead with this email or phone already exists (id={dup.id})",
        )

    lead = Lead(
        name=data.name,
        phone=data.phone,
        email=data.email,
        source=data.source,
        status=data.status,
        assigned_to=data.assigned_to,
        notes=data.notes,
        budget=data.budget,
        preferred_location=data.preferred_location,
        last_activity_at=datetime.now(timezone.utc),
    )

    # Compute initial score
    lead.score = compute_score(lead)

    # Set next action if provided, else auto-suggest
    if data.next_action:
        lead.next_action = data.next_action.type
        lead.next_action_due = data.next_action.due_at
        lead.next_action_note = data.next_action.note
    else:
        action_type, due_at, note = suggest_next_action(lead)
        lead.next_action = action_type
        lead.next_action_due = due_at
        lead.next_action_note = note

    db.add(lead)
    await db.flush()  # get lead.id

    # Status history
    db.add(LeadStatusHistory(lead_id=lead.id, old_status=None, new_status=lead.status, changed_by=actor_id))

    # Activity log
    await log_activity(db, lead.id, ActivityType.lead_created, f"Lead {lead.name} was created", actor_id=actor_id, touch_lead=False)
    if lead.assigned_to:
        user_result = await db.execute(select(User).where(User.id == lead.assigned_to))
        agent = user_result.scalar_one_or_none()
        await log_activity(db, lead.id, ActivityType.assigned, f"Assigned to {agent.name if agent else 'agent'}", actor_id=actor_id, touch_lead=False)

    return lead


# ── List / Filter ────────────────────────────────────────────────────────────

async def list_leads(
    db: AsyncSession,
    *,
    status: Optional[LeadStatus] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    overdue_only: bool = False,
    hot_only: bool = False,
    sort_by: str = "last_activity_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
    current_user_role: Optional[str] = None,
    current_user_id: Optional[str] = None,
) -> tuple[List[Lead], int]:

    q = select(Lead).options(selectinload(Lead.assigned_user))

    # Role-based filter: agents only see their own leads
    if current_user_role == "agent" and current_user_id:
        q = q.where(Lead.assigned_to == current_user_id)

    if status:
        q = q.where(Lead.status == status)
    if assigned_to:
        q = q.where(Lead.assigned_to == assigned_to)
    if search:
        term = f"%{search.lower()}%"
        q = q.where(
            or_(
                func.lower(Lead.name).like(term),
                func.lower(Lead.email).like(term),
                func.lower(Lead.phone).like(term),
                func.lower(Lead.preferred_location).like(term),
            )
        )
    if hot_only:
        q = q.where(Lead.score >= 80)

    # Count
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Sort
    sort_col = getattr(Lead, sort_by, Lead.last_activity_at)
    q = q.order_by(desc(sort_col) if sort_dir == "desc" else asc(sort_col))

    # Paginate
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    leads = list(result.scalars().all())

    # Apply SLA filter (post-query, small sets)
    if overdue_only:
        leads = [l for l in leads if is_sla_breached(l)]

    return leads, total


# ── Get single ───────────────────────────────────────────────────────────────

async def get_lead(db: AsyncSession, lead_id: str) -> Optional[Lead]:
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.assigned_user))
        .where(Lead.id == lead_id)
    )
    return result.scalar_one_or_none()


# ── Update ───────────────────────────────────────────────────────────────────

async def update_lead(
    db: AsyncSession,
    lead: Lead,
    data: LeadUpdate,
    actor_id: Optional[str] = None,
) -> Lead:
    old_status = lead.status
    old_assigned = lead.assigned_to

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "next_action" and value is not None:
            lead.next_action = value["type"]
            lead.next_action_due = value["due_at"]
            lead.next_action_note = value.get("note")
        elif field != "next_action":
            setattr(lead, field, value)

    lead.updated_at = datetime.now(timezone.utc)
    lead.score = compute_score(lead)

    # Track status change
    if data.status and data.status != old_status:
        db.add(LeadStatusHistory(lead_id=lead.id, old_status=old_status, new_status=lead.status, changed_by=actor_id))
        await log_activity(
            db, lead.id, ActivityType.status_changed,
            f"Status changed: {old_status.value} → {lead.status.value}",
            actor_id=actor_id
        )
        # Auto-suggest next action on stage change
        action_type, due_at, note = suggest_next_action(lead)
        lead.next_action = action_type
        lead.next_action_due = due_at
        lead.next_action_note = note

    # Track assignment change
    if data.assigned_to is not None and data.assigned_to != old_assigned:
        agent_result = await db.execute(select(User).where(User.id == data.assigned_to))
        agent = agent_result.scalar_one_or_none()
        await log_activity(
            db, lead.id, ActivityType.assigned,
            f"Assigned to {agent.name if agent else 'agent'}",
            actor_id=actor_id
        )

    # Track note update
    if data.notes is not None:
        await log_activity(db, lead.id, ActivityType.note_added, "Note updated", actor_id=actor_id)

    return lead


# ── Assign ───────────────────────────────────────────────────────────────────

async def assign_lead(
    db: AsyncSession,
    lead: Lead,
    user_id: Optional[str],
    actor_id: Optional[str] = None,
) -> Lead:
    lead.assigned_to = user_id
    lead.updated_at = datetime.now(timezone.utc)

    if user_id:
        result = await db.execute(select(User).where(User.id == user_id))
        agent = result.scalar_one_or_none()
        if not agent:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        await log_activity(db, lead.id, ActivityType.assigned, f"Assigned to {agent.name}", actor_id=actor_id)
    else:
        await log_activity(db, lead.id, ActivityType.assigned, "Lead unassigned", actor_id=actor_id)

    return lead


# ── Status change ────────────────────────────────────────────────────────────

async def change_status(
    db: AsyncSession,
    lead: Lead,
    new_status: LeadStatus,
    actor_id: Optional[str] = None,
) -> Lead:
    old_status = lead.status
    if old_status == new_status:
        return lead

    lead.status = new_status
    lead.updated_at = datetime.now(timezone.utc)
    lead.score = compute_score(lead)

    db.add(LeadStatusHistory(lead_id=lead.id, old_status=old_status, new_status=new_status, changed_by=actor_id))
    await log_activity(
        db, lead.id, ActivityType.status_changed,
        f"Status changed: {old_status.value} → {new_status.value}",
        actor_id=actor_id
    )

    # Auto next action
    action_type, due_at, note = suggest_next_action(lead)
    lead.next_action = action_type
    lead.next_action_due = due_at
    lead.next_action_note = note

    return lead


# ── Bulk operations ──────────────────────────────────────────────────────────

async def bulk_assign(
    db: AsyncSession,
    lead_ids: List[str],
    user_id: Optional[str],
    actor_id: Optional[str] = None,
) -> int:
    result = await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))
    leads = result.scalars().all()
    agent_name = "Unassigned"
    if user_id:
        u = await db.execute(select(User).where(User.id == user_id))
        agent = u.scalar_one_or_none()
        if agent:
            agent_name = agent.name

    for lead in leads:
        lead.assigned_to = user_id
        lead.updated_at = datetime.now(timezone.utc)
        await log_activity(
            db, lead.id, ActivityType.assigned,
            f"Bulk assigned to {agent_name}", actor_id=actor_id, touch_lead=True
        )
    return len(leads)


async def bulk_status_update(
    db: AsyncSession,
    lead_ids: List[str],
    new_status: LeadStatus,
    actor_id: Optional[str] = None,
) -> int:
    result = await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))
    leads = result.scalars().all()
    for lead in leads:
        old = lead.status
        lead.status = new_status
        lead.updated_at = datetime.now(timezone.utc)
        lead.score = compute_score(lead)
        db.add(LeadStatusHistory(lead_id=lead.id, old_status=old, new_status=new_status, changed_by=actor_id))
        await log_activity(
            db, lead.id, ActivityType.status_changed,
            f"Bulk status: {old.value} → {new_status.value}", actor_id=actor_id
        )
    return len(leads)
