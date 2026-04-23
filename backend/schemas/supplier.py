from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SupplierBase(BaseModel):
    id: int
    name: str
    country: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class SupplierListItem(BaseModel):
    id: int
    name: str
    country: Optional[str] = None
    assignments_count: int
    is_assigned: bool  # True si >= 1 assignment

    class Config:
        from_attributes = True


class ConsultantBrief(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class SupplierDetail(BaseModel):
    id: int
    name: str
    country: Optional[str] = None
    is_active: bool
    consultants: list[ConsultantBrief]
    assignments_count: int

    class Config:
        from_attributes = True


class SupplierCreate(BaseModel):
    name: str
    country: Optional[str] = None