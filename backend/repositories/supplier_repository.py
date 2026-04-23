from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Supplier, Assignment, Consultant, User


def list_all(
    db: Session,
    search: Optional[str] = None,
    only_unassigned: bool = False,
    only_assigned: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[dict], int]:
    """Retourne (items, total). `only_unassigned` filtre les suppliers sans aucune affectation."""
    # Sous-requête : nombre d'assignments par supplier
    assignment_count_sq = (
        db.query(
            Assignment.supplier_id,
            func.count(Assignment.id).label("cnt"),
        )
        .group_by(Assignment.supplier_id)
        .subquery()
    )

    query = db.query(
        Supplier,
        func.coalesce(assignment_count_sq.c.cnt, 0).label("assignments_count"),
    ).outerjoin(
        assignment_count_sq, Supplier.id == assignment_count_sq.c.supplier_id
    )

    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(Supplier.name.ilike(pattern))

    if only_unassigned:
        query = query.filter(func.coalesce(assignment_count_sq.c.cnt, 0) == 0)
    elif only_assigned:
        query = query.filter(func.coalesce(assignment_count_sq.c.cnt, 0) > 0)

    total = query.count()
    rows = query.order_by(Supplier.name).offset(skip).limit(limit).all()

    items = [
        {
            "id": s.id,
            "name": s.name,
            "country": s.country,
            "assignments_count": cnt,
            "is_assigned": cnt > 0,
        }
        for s, cnt in rows
    ]
    return items, total


def get_detail(db: Session, supplier_id: int) -> Optional[dict]:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        return None

    consultants = (
        db.query(Consultant, User)
        .join(User, Consultant.user_id == User.id)
        .join(Assignment, Assignment.consultant_id == Consultant.id)
        .filter(Assignment.supplier_id == supplier_id)
        .order_by(User.name)
        .all()
    )

    return {
        "id": supplier.id,
        "name": supplier.name,
        "country": supplier.country,
        "is_active": supplier.is_active,
        "consultants": [
            {"id": c.id, "name": u.name, "email": u.email}
            for c, u in consultants
        ],
        "assignments_count": len(consultants),
    }


def create(db: Session, name: str, country: Optional[str] = None) -> Supplier:
    supplier = Supplier(name=name, country=country)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def get_by_name(db: Session, name: str) -> Optional[Supplier]:
    return db.query(Supplier).filter(Supplier.name == name).first()