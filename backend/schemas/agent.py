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

# ============================================================
#   POST /api/agent/recommend-docks - Phase 8.6b
# ============================================================

class RecommendDocksRequest(BaseModel):
    packaging_code: str = Field(..., description="Code packaging (ex: R3147)")
    quantity: float = Field(..., gt=0, description="Quantite besoin")
    seller_cofor: str = Field(..., min_length=1)
    empty_return_cofor: str = Field(..., min_length=1)


class DockSplit(BaseModel):
    dock_name: str
    qty: float
    percent: float


class DockPlan(BaseModel):
    plan_label: str
    splits: list[DockSplit]
    reasoning: str


class SupplierBrief(BaseModel):
    name: str | None = None
    city: str | None = None
    country: str | None = None
    seller_cofor: str | None = None
    empty_return_cofor: str | None = None


class RecommendDocksResponse(BaseModel):
    supplier: SupplierBrief | None = None
    packaging_code: str = ""
    quantity: float = 0
    mode: str = "supplier_chain"   # "supplier_chain" ou "fallback_geographic"
    candidates_count: int = 0
    primary: DockPlan | None = None
    alternatives: list[DockPlan] = []
    summary: str = ""
    model_used: str = ""
    error: str | None = None
    message: str | None = None
