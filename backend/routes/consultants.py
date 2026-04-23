from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.consultant import ConsultantDetail, ConsultantListItem
from services.deps import get_current_user
from repositories import consultant_repository


router = APIRouter(prefix="/api/consultants", tags=["consultants"])


@router.get("", response_model=list[ConsultantListItem])
def list_consultants(
    people_manager_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return consultant_repository.list_all(
        db, people_manager_id=people_manager_id, skip=skip, limit=limit
    )


@router.get("/{consultant_id}", response_model=ConsultantDetail)
def get_consultant(
    consultant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = consultant_repository.get_detail(db, consultant_id)
    if not c:
        raise HTTPException(status_code=404, detail="Consultant introuvable")
    return c