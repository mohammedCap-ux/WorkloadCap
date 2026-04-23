from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Consultant, Supplier
from schemas.assignment import (
    AssignmentDetail, AssignmentCreate, AssignmentBulkCreate,
)
from services.deps import get_current_user, require_manager
from repositories import assignment_repository


router = APIRouter(prefix="/api/assignments", tags=["assignments"])


@router.get("", response_model=list[AssignmentDetail])
def list_assignments(
    consultant_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    assigned_by: Optional[str] = Query(None, description="manual ou ai_agent"),
    skip: int = 0,
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return assignment_repository.list_all(
        db, consultant_id=consultant_id, supplier_id=supplier_id,
        assigned_by=assigned_by, skip=skip, limit=limit,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    # Vérifs d'intégrité
    if not db.query(Consultant).filter(Consultant.id == payload.consultant_id).first():
        raise HTTPException(status_code=404, detail="Consultant introuvable")
    if not db.query(Supplier).filter(Supplier.id == payload.supplier_id).first():
        raise HTTPException(status_code=404, detail="Supplier introuvable")
    if assignment_repository.exists(db, payload.consultant_id, payload.supplier_id):
        raise HTTPException(
            status_code=409,
            detail="Cette affectation existe déjà",
        )
    a = assignment_repository.create(
        db, payload.consultant_id, payload.supplier_id, payload.assigned_by
    )
    return {
        "id": a.id,
        "consultant_id": a.consultant_id,
        "supplier_id": a.supplier_id,
        "assigned_by": a.assigned_by,
        "assigned_at": a.assigned_at,
    }


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_assignments_bulk(
    payload: AssignmentBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Utilisé par le front pour valider un plan d'affectation de l'agent IA."""
    # On accepte les duplicats silencieusement (ignorés par le repo)
    items = [
        {"consultant_id": i.consultant_id, "supplier_id": i.supplier_id, "assigned_by": i.assigned_by}
        for i in payload.items
    ]
    created = assignment_repository.create_bulk(db, items)
    return {
        "created_count": len(created),
        "skipped_count": len(items) - len(created),
        "ids": [a.id for a in created],
    }


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    ok = assignment_repository.delete(db, assignment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Assignment introuvable")
    return None