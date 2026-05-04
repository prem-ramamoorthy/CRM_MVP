from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.models.activity import ActivityType


class ActivityCreate(BaseModel):
    lead_id: str
    type: ActivityType
    message: str
    meta: Optional[Dict[str, Any]] = None


class ActivityOut(BaseModel):
    id: str
    lead_id: str
    type: ActivityType
    message: str
    meta: Optional[Dict[str, Any]]
    actor_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
