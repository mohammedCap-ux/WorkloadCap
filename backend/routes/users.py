from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.user import UserBase, UserList
from services.deps import get_current_user
from repositories import user_repository


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=UserList)
def list_users(
    role: Optional[str] = Query(None, description="Filtrer par rôle: consultant, manager, people_manager"),
    search: Optional[str] = Query(None, description="Recherche par nom ou email"),
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = user_repository.list_all(db, role=role, search=search, skip=skip, limit=limit)
    return {"total": total, "items": items}


@router.get("/{user_id}", response_model=UserBase)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = user_repository.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user