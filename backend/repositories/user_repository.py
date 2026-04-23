from typing import Optional
from sqlalchemy.orm import Session
from models import User


def get_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def list_all(
    db: Session,
    role: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[User], int]:
    """Retourne (items, total) pour pagination côté front."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(
            (User.name.ilike(pattern)) | (User.email.ilike(pattern))
        )

    total = query.count()
    items = query.order_by(User.name).offset(skip).limit(limit).all()
    return items, total