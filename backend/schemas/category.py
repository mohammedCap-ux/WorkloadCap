from pydantic import BaseModel


class TaskItem(BaseModel):
    id: int
    name: str
    standard_duration_min: int

    class Config:
        from_attributes = True


class CategoryDetail(BaseModel):
    id: int
    name: str
    icon: str | None = None
    tasks: list[TaskItem]

    class Config:
        from_attributes = True