from datetime import datetime, timezone, timedelta
from app.models.lead import Lead, LeadStatus, NextActionType


def suggest_next_action(lead: Lead) -> tuple[NextActionType, datetime, str]:
    """
    Returns (action_type, due_at, note) based on current lead state.

    Priority:
    1. High score + New → call immediately
    2. Contacted + idle → follow-up
    3. Interested       → schedule visit
    4. Visit Scheduled  → confirm visit
    5. Closed           → no action needed (send info)
    """
    now = datetime.now(timezone.utc)

    if lead.status == LeadStatus.new:
        if lead.score >= 70:
            return NextActionType.call, now + timedelta(hours=2), "High-score lead — call immediately"
        return NextActionType.call, now + timedelta(hours=6), "Intro call to qualify"

    if lead.status == LeadStatus.contacted:
        return NextActionType.follow_up, now + timedelta(hours=24), "Follow up on previous conversation"

    if lead.status == LeadStatus.interested:
        return NextActionType.visit, now + timedelta(hours=48), "Schedule a property visit"

    if lead.status == LeadStatus.visit_scheduled:
        return NextActionType.visit, now + timedelta(hours=12), "Confirm visit details"

    # Closed
    return NextActionType.send_info, now + timedelta(hours=72), "Send welcome package"
