from typing import Optional
from sqlalchemy.orm import Session
from models import Assignment, Consultant, User, Supplier


def list_all(
    db: Session,
    consultant_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    assigned_by: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> list[dict]:
    query = (
        db.query(Assignment, User, Supplier)
        .join(Consultant, Assignment.consultant_id == Consultant.id)
        .join(User, Consultant.user_id == User.id)
        .join(Supplier, Assignment.supplier_id == Supplier.id)
    )

    if consultant_id:
        query = query.filter(Assignment.consultant_id == consultant_id)
    if supplier_id:
        query = query.filter(Assignment.supplier_id == supplier_id)
    if assigned_by:
        query = query.filter(Assignment.assigned_by == assigned_by)

    rows = (
        query.order_by(Assignment.assigned_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": a.id,
            "consultant_id": a.consultant_id,
            "consultant_name": u.name,
            "supplier_id": a.supplier_id,
            "supplier_name": s.name,
            "assigned_by": a.assigned_by,
            "assigned_at": a.assigned_at,
        }
        for a, u, s in rows
    ]


def exists(db: Session, consultant_id: int, supplier_id: int) -> bool:
    return (
        db.query(Assignment)
        .filter(
            Assignment.consultant_id == consultant_id,
            Assignment.supplier_id == supplier_id,
        )
        .first()
        is not None
    )


def create(
    db: Session,
    consultant_id: int,
    supplier_id: int,
    assigned_by: str = "manual",
) -> Assignment:
    assignment = Assignment(
        consultant_id=consultant_id,
        supplier_id=supplier_id,
        assigned_by=assigned_by,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def create_bulk(
    db: Session,
    items: list[dict],
) -> list[Assignment]:
    """
    Crée plusieurs assignments en une seule transaction.
    Chaque item = {"consultant_id": int, "supplier_id": int, "assigned_by": str}.
    Ignore silencieusement les doublons.
    """
    created = []
    for item in items:
        if exists(db, item["consultant_id"], item["supplier_id"]):
            continue
        a = Assignment(
            consultant_id=item["consultant_id"],
            supplier_id=item["supplier_id"],
            assigned_by=item.get("assigned_by", "manual"),
        )
        db.add(a)
        created.append(a)
    db.commit()
    for a in created:
        db.refresh(a)
    return created


def delete(db: Session, assignment_id: int) -> bool:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        return False
    db.delete(a)
    db.commit()
    return True