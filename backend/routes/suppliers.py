from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.supplier import (
    SupplierBase, SupplierListItem, SupplierDetail, SupplierCreate,
)
from services.deps import get_current_user, require_manager
from repositories import supplier_repository


router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=dict)
def list_suppliers(
    search: Optional[str] = Query(None, description="Recherche par nom"),
    only_unassigned: bool = Query(False, description="Ne retourner que les suppliers sans affectation"),
    only_assigned: bool = Query(False, description="Ne retourner que les suppliers avec affectation(s)"),
    skip: int = 0,
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if only_unassigned and only_assigned:
        raise HTTPException(
            status_code=400,
            detail="only_unassigned et only_assigned sont mutuellement exclusifs",
        )
    items, total = supplier_repository.list_all(
        db, search=search,
        only_unassigned=only_unassigned,
        only_assigned=only_assigned,
        skip=skip, limit=limit,
    )
    return {"total": total, "items": items}


@router.get("/{supplier_id}", response_model=SupplierDetail)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = supplier_repository.get_detail(db, supplier_id)
    if not s:
        raise HTTPException(status_code=404, detail="Supplier introuvable")
    return s


@router.post("", response_model=SupplierBase, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),  # seuls les managers créent
):
    existing = supplier_repository.get_by_name(db, payload.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Un supplier nommé '{payload.name}' existe déjà",
        )
    return supplier_repository.create(db, name=payload.name, country=payload.country)