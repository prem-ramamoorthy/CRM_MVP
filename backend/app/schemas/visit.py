from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class VisitCreate(BaseModel):
    lead_id: str
    scheduled_at: datetime
    notes: Optional[str] = None


class VisitOut(BaseModel):
    id: str
    lead_id: str
    scheduled_at: datetime
    notes: Optional[str]
    created_at: datetime

    # Embedded lead info for context
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None

    model_config = {"from_attributes": True}
