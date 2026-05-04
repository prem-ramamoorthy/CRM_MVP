from datetime import datetime, timezone, timedelta
from app.models.lead import Lead, LeadStatus
from app.core.config import settings


def is_sla_breached(lead: Lead) -> bool:
    """
    Check if the lead has breached its SLA based on status and last activity.
    SLA thresholds:
      New          → must be contacted within SLA_NEW_HOURS
      Contacted    → must be moved within SLA_CONTACTED_HOURS
      Interested   → must be visited within SLA_INTERESTED_HOURS
      Others       → no SLA
    """
    now = datetime.now(timezone.utc)
    last = lead.last_activity_at

    # Ensure timezone-aware
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)

    thresholds = {
        LeadStatus.new: timedelta(hours=settings.SLA_NEW_HOURS),
        LeadStatus.contacted: timedelta(hours=settings.SLA_CONTACTED_HOURS),
        LeadStatus.interested: timedelta(hours=settings.SLA_INTERESTED_HOURS),
    }

    threshold = thresholds.get(lead.status)
    if threshold is None:
        return False

    return (now - last) > threshold
