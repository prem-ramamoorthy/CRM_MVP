"""
Lead Scoring Engine
Produces a score 0-100 based on:
  - Budget tier        (0-40 pts)
  - Activity recency   (0-30 pts)
  - Pipeline stage     (0-30 pts)
"""
from datetime import datetime, timezone, timedelta
from app.models.lead import Lead, LeadStatus


STAGE_SCORES: dict[LeadStatus, int] = {
    LeadStatus.new: 5,
    LeadStatus.contacted: 10,
    LeadStatus.interested: 20,
    LeadStatus.visit_scheduled: 25,
    LeadStatus.closed: 30,
}

BUDGET_TIERS: list[tuple[float, int]] = [
    (25_000, 40),
    (20_000, 32),
    (15_000, 24),
    (12_000, 16),
    (8_000, 8),
    (0, 4),
]


def score_budget(budget: float | None) -> int:
    if not budget:
        return 0
    for threshold, pts in BUDGET_TIERS:
        if budget >= threshold:
            return pts
    return 4


def score_recency(last_activity_at: datetime) -> int:
    now = datetime.now(timezone.utc)
    last = last_activity_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)

    age = now - last
    if age < timedelta(hours=6):
        return 30
    if age < timedelta(hours=24):
        return 24
    if age < timedelta(days=3):
        return 16
    if age < timedelta(days=7):
        return 8
    return 2


def compute_score(lead: Lead) -> int:
    budget_pts = score_budget(lead.budget)
    recency_pts = score_recency(lead.last_activity_at)
    stage_pts = STAGE_SCORES.get(lead.status, 0)
    raw = budget_pts + recency_pts + stage_pts
    return min(100, max(0, raw))
