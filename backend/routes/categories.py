from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.category import CategoryDetail
from services.deps import get_current_user
from repositories import category_repository


router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryDetail])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_repository.list_all(db)