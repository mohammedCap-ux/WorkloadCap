from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    country = Column(String, nullable=True)  # extrait du nom quand possible
    is_active = Column(Boolean, default=True)

    assignments = relationship("Assignment", back_populates="supplier")