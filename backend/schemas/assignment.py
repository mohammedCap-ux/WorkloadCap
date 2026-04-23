from pydantic import BaseModel
from datetime import datetime


class AssignmentBase(BaseModel):
    id: int
    consultant_id: int
    supplier_id: int
    assigned_by: str  # "manual" | "ai_agent"
    assigned_at: datetime

    class Config:
        from_attributes = True


class AssignmentDetail(BaseModel):
    id: int
    consultant_id: int
    consultant_name: str
    supplier_id: int
    supplier_name: str
    assigned_by: str
    assigned_at: datetime


class AssignmentCreate(BaseModel):
    consultant_id: int
    supplier_id: int
    assigned_by: str = "manual"  # par défaut manuel


class AssignmentBulkCreate(BaseModel):
    """Pour l'agent IA : créer plusieurs assignments d'un coup."""
    items: list[AssignmentCreate]