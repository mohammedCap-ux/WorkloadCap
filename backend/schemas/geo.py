"""
schemas/geo.py
--------------
Modeles Pydantic pour les endpoints de geolocalisation.
"""

from pydantic import BaseModel, Field


# ============================================================
#   INPUT
# ============================================================

class DockCandidate(BaseModel):
    """Un dock candidat envoye par le frontend (lu depuis le xlsx cote consultant)."""
    dock_name: str
    lat: float
    lng: float


class ClosestDocksRequest(BaseModel):
    """Corps de la requete POST /api/geo/closest-docks"""
    supplier_name: str = Field(..., description="Nom du fournisseur (pour le LLM)")
    supplier_lat: float
    supplier_lng: float
    quantity: float | None = Field(None, description="Besoin en quantite (optionnel)")
    candidates: list[DockCandidate] = Field(
        ..., description="Tous les docks candidats avec leurs coords", min_length=1
    )


# ============================================================
#   OUTPUT
# ============================================================

class DockResult(BaseModel):
    """Un dock dans le top 5 retourne au consultant."""
    dock_name: str
    lat: float
    lng: float
    distance_km: float
    reason: str


class ClosestDocksResponse(BaseModel):
    """Reponse de POST /api/geo/closest-docks"""
    top5: list[DockResult]
    summary: str
    model_used: str