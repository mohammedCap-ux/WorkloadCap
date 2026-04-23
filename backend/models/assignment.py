from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    consultant_id = Column(Integer, ForeignKey("consultants.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)

    # "manual" (créé par un manager) ou "ai_agent" (créé par l'agent)
    assigned_by = Column(String, default="manual")
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    consultant = relationship("Consultant", back_populates="assignments")
    supplier = relationship("Supplier", back_populates="assignments")