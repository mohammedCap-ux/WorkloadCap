from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class WorkloadDeclaration(Base):
    __tablename__ = "declarations"

    id = Column(Integer, primary_key=True, index=True)
    consultant_id = Column(Integer, ForeignKey("consultants.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    date = Column(Date, nullable=False)
    standard_duration_min = Column(Integer, nullable=False)
    real_duration_min = Column(Integer, nullable=False)
    status = Column(String, default="done")  # "done" | "ongoing"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    consultant = relationship("Consultant", back_populates="declarations")
    task = relationship("Task")