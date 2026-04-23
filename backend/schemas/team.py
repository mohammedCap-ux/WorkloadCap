from pydantic import BaseModel
from typing import Optional


class ConsultantInTeam(BaseModel):
    id: int
    name: str
    email: str
    trips: int
    suppliers_count: int

    class Config:
        from_attributes = True


class PeopleManagerInTeam(BaseModel):
    id: int
    name: str
    email: str
    consultants: list[ConsultantInTeam]

    class Config:
        from_attributes = True


class TeamDetail(BaseModel):
    id: int
    manager_name: str
    people_managers: list[PeopleManagerInTeam]
    total_consultants: int
    total_suppliers: int

    class Config:
        from_attributes = True


class TeamListItem(BaseModel):
    id: int
    manager_name: str
    people_managers_count: int
    consultants_count: int

    class Config:
        from_attributes = True