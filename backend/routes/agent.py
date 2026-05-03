"""
routes/agent.py
---------------
Endpoints de l'agent IA pour l'affectation automatique de fournisseurs.

POST /api/agent/propose-assignments : genere des propositions via LLM
POST /api/agent/confirm-assignments : applique les propositions validees

Reserve aux managers et people_managers.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.agent import (
    ProposeRequest, ProposeResponse,
    ConfirmRequest, ConfirmResponse,
)
from services.deps import get_current_user
from services.agent_service import propose_assignments, confirm_assignments


router = APIRouter(prefix="/api/agent", tags=["agent"])


def _require_manager_or_pm(current_user: User):
    """Seuls les managers et people_managers peuvent utiliser l'agent IA."""
    if current_user.role not in ("manager", "people_manager"):
        raise HTTPException(
            status_code=403,
            detail="Seuls les managers et people_managers peuvent utiliser l'agent IA",
        )


@router.post("/propose-assignments", response_model=ProposeResponse)
def propose(
    payload: ProposeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Genere des propositions d'affectation pour une liste de fournisseurs.
    N'applique rien en BDD : le manager doit valider via /confirm-assignments.
    """
    _require_manager_or_pm(current_user)

    try:
        result = propose_assignments(db, payload.supplier_names)
    except RuntimeError as e:
        # Typiquement : cle API manquante
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur agent IA : {str(e)}")

    return result


@router.post("/confirm-assignments", response_model=ConfirmResponse)
def confirm(
    payload: ConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Applique les propositions validees par le manager.
    Cree les suppliers inexistants et les affectations avec assigned_by='ai'.
    """
    _require_manager_or_pm(current_user)

    result = confirm_assignments(db, payload.proposals)
    return result