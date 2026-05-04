from typing import List, Dict, Optional
from pydantic import BaseModel


class MetricsOut(BaseModel):
    total_leads: int
    leads_today: int
    visits_today: int
    visits_scheduled: int
    closed: int
    conversion_rate: float  # 0.0-100.0
    hot_leads: int          # score >= 80
    overdue_leads: int      # SLA breached


class FunnelStage(BaseModel):
    status: str
    count: int
    percentage: float


class FunnelOut(BaseModel):
    stages: List[FunnelStage]
    total: int


class AgentPerformance(BaseModel):
    agent_id: str
    agent_name: str
    total: int
    closed: int
    conversion_rate: float


class ActivitySummaryOut(BaseModel):
    recent_activity_count: int   # last 7 days
    by_type: Dict[str, int]      # type → count
    agent_performance: List[AgentPerformance]
