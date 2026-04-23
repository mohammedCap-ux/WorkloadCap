from pydantic import BaseModel
from typing import Optional


class SupplierBrief(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ConsultantDetail(BaseModel):
    id: int
    name: str
    email: str
    trips: int
    team_manager: Optional[str] = None
    people_manager: Optional[str] = None
    suppliers: list[SupplierBrief]
    suppliers_count: int

    class Config:
        from_attributes = True


class ConsultantListItem(BaseModel):
    id: int
    name: str
    email: str
    trips: int
    suppliers_count: int
    people_manager: Optional[str] = None

    class Config:
        from_attributes = True