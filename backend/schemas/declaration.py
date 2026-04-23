from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class DeclarationCreate(BaseModel):
    task_id: int
    date: date
    real_duration_min: int = Field(gt=0, le=1440)
    status: str = "done"


class DeclarationUpdate(BaseModel):
    real_duration_min: Optional[int] = Field(None, gt=0, le=1440)
    status: Optional[str] = None


class DeclarationDetail(BaseModel):
    id: int
    consultant_id: int
    consultant_name: str
    task_id: int
    task_name: str
    category_name: str
    date: date
    standard_duration_min: int
    real_duration_min: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeclarationStats(BaseModel):
    total_declarations: int
    total_real_min: int
    total_standard_min: int
    done_count: int
    ongoing_count: int
    efficiency_pct: float