from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Consultant(Base):
    __tablename__ = "consultants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    people_manager_id = Column(Integer, ForeignKey("people_managers.id"), nullable=True)
    trips = Column(Integer, default=0)  # voyages effectués

    user = relationship("User", back_populates="consultant")
    people_manager = relationship("PeopleManager", back_populates="consultants")
    assignments = relationship("Assignment", back_populates="consultant")
    declarations = relationship("WorkloadDeclaration", back_populates="consultant")