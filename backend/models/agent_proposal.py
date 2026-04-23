from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class AgentProposal(Base):
    __tablename__ = "agent_proposals"

    id = Column(Integer, primary_key=True, index=True)
    manager_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Payloads JSON stockés en texte — ce que l'IA a proposé vs ce qui a été validé
    proposed_json = Column(Text, nullable=False)
    confirmed_json = Column(Text, nullable=True)

    status = Column(String, default="pending")  # "pending" | "confirmed" | "rejected"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)