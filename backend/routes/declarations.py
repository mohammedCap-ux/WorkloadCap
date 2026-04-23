from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Consultant
from schemas.declaration import (
    DeclarationCreate, DeclarationUpdate, DeclarationDetail, DeclarationStats,
)
from services.deps import get_current_user
from repositories import declaration_repository, consultant_repository


router = APIRouter(prefix="/api/declarations", tags=["declarations"])


def _resolve_consultant_or_403(
    db: Session,
    current_user: User,
    target_consultant_id: Optional[int] = None,
) -> Consultant:
    """
    Consultant : ne voit que ses propres déclarations (target ignoré).
    Manager / PM : doit préciser consultant_id.
    """
    if current_user.role == "consultant":
        my_consultant = consultant_repository.get_by_user_id(db, current_user.id)
        if not my_consultant:
            raise HTTPException(status_code=404, detail="Aucun profil consultant associé")
        return my_consultant

    if not target_consultant_id:
        raise HTTPException(status_code=400, detail="Les managers doivent préciser consultant_id")
    target = db.query(Consultant).filter(Consultant.id == target_consultant_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Consultant introuvable")
    return target


@router.get("", response_model=list[DeclarationDetail])
def list_declarations(
    consultant_id: Optional[int] = Query(None, description="Réservé aux managers/PM"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultant = _resolve_consultant_or_403(db, current_user, consultant_id)
    return declaration_repository.list_for_consultant(
        db, consultant.id,
        date_from=date_from, date_to=date_to,
        skip=skip, limit=limit,
    )


@router.get("/stats", response_model=DeclarationStats)
def get_stats(
    consultant_id: Optional[int] = Query(None),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consultant = _resolve_consultant_or_403(db, current_user, consultant_id)
    return declaration_repository.get_stats(
        db, consultant.id, date_from=date_from, date_to=date_to
    )


@router.post("", response_model=DeclarationDetail, status_code=status.HTTP_201_CREATED)
def create_my_declaration(
    payload: DeclarationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "consultant":
        raise HTTPException(status_code=403, detail="Seuls les consultants peuvent créer des déclarations")

    my_consultant = consultant_repository.get_by_user_id(db, current_user.id)
    if not my_consultant:
        raise HTTPException(status_code=404, detail="Profil consultant introuvable")

    try:
        decl = declaration_repository.create(
            db,
            consultant_id=my_consultant.id,
            task_id=payload.task_id,
            date_val=payload.date,
            real_duration_min=payload.real_duration_min,
            status=payload.status,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    items = declaration_repository.list_for_consultant(db, my_consultant.id, skip=0, limit=1)
    return items[0]


@router.patch("/{declaration_id}", response_model=DeclarationDetail)
def update_my_declaration(
    declaration_id: int,
    payload: DeclarationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decl = declaration_repository.get_by_id(db, declaration_id)
    if not decl:
        raise HTTPException(status_code=404, detail="Déclaration introuvable")

    if current_user.role == "consultant":
        my_consultant = consultant_repository.get_by_user_id(db, current_user.id)
        if not my_consultant or decl.consultant_id != my_consultant.id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos déclarations")

    declaration_repository.update(
        db, declaration_id,
        real_duration_min=payload.real_duration_min,
        status=payload.status,
    )
    items = declaration_repository.list_for_consultant(db, decl.consultant_id, skip=0, limit=500)
    return next((i for i in items if i["id"] == declaration_id), items[0])


@router.delete("/{declaration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_declaration(
    declaration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decl = declaration_repository.get_by_id(db, declaration_id)
    if not decl:
        raise HTTPException(status_code=404, detail="Déclaration introuvable")

    if current_user.role == "consultant":
        my_consultant = consultant_repository.get_by_user_id(db, current_user.id)
        if not my_consultant or decl.consultant_id != my_consultant.id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos déclarations")

    declaration_repository.delete(db, declaration_id)
    return None