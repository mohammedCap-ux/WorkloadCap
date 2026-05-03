"""
schemas/agent.py
----------------
Modeles Pydantic pour les endpoints de l'agent IA.
"""

from pydantic import BaseModel, Field
from schemas.assignment import AssignmentDetail


# ============================================================
#   INPUT
# ============================================================

class ProposeRequest(BaseModel):
    """Corps de la requete POST /api/agent/propose-assignments"""
    supplier_names: list[str] = Field(
        ..., description="Liste de noms de fournisseurs a repartir", min_length=1
    )


class ConfirmRequest(BaseModel):
    """Corps de la requete POST /api/agent/confirm-assignments"""
    proposals: list[dict] = Field(
        ..., description="Liste de propositions validees par le manager", min_length=1
    )


# ============================================================
#   OUTPUT
# ============================================================

class RejectedItem(BaseModel):
    """Un nom rejete par l'IA (entete, placeholder, etc.)."""
    supplier_name: str
    reason: str


class Proposal(BaseModel):
    """Une proposition d'affectation par l'IA."""
    supplier_name: str
    consultant_id: int
    consultant_name: str
    reason: str


class ProposeResponse(BaseModel):
    """Reponse de POST /api/agent/propose-assignments"""
    proposals: list[Proposal]
    rejected: list[RejectedItem] = []
    summary: str
    model_used: str
    stats: dict = {}


class ConfirmResponse(BaseModel):
    """Reponse de POST /api/agent/confirm-assignments"""
    created_assignments: list[AssignmentDetail]
    errors: list[str] = []
