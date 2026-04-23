from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    manager_name = Column(String, unique=True, nullable=False)

    people_managers = relationship("PeopleManager", back_populates="team")