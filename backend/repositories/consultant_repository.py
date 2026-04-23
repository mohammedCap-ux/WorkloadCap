from typing import Optional
from sqlalchemy.orm import Session
from models import Consultant, User, PeopleManager, Team, Assignment, Supplier


def list_all(
    db: Session,
    people_manager_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[dict]:
    query = (
        db.query(Consultant, User, PeopleManager)
        .join(User, Consultant.user_id == User.id)
        .outerjoin(PeopleManager, Consultant.people_manager_id == PeopleManager.id)
    )
    if people_manager_id:
        query = query.filter(Consultant.people_manager_id == people_manager_id)

    rows = query.order_by(User.name).offset(skip).limit(limit).all()

    result = []
    for cos, user, pm in rows:
        sup_count = (
            db.query(Assignment).filter(Assignment.consultant_id == cos.id).count()
        )
        result.append({
            "id": cos.id,
            "name": user.name,
            "email": user.email,
            "trips": cos.trips,
            "suppliers_count": sup_count,
            "people_manager": pm.name if pm else None,
        })
    return result


def get_detail(db: Session, consultant_id: int) -> Optional[dict]:
    row = (
        db.query(Consultant, User, PeopleManager, Team)
        .join(User, Consultant.user_id == User.id)
        .outerjoin(PeopleManager, Consultant.people_manager_id == PeopleManager.id)
        .outerjoin(Team, PeopleManager.team_id == Team.id)
        .filter(Consultant.id == consultant_id)
        .first()
    )
    if not row:
        return None

    cos, user, pm, team = row

    suppliers = (
        db.query(Supplier)
        .join(Assignment, Assignment.supplier_id == Supplier.id)
        .filter(Assignment.consultant_id == cos.id)
        .order_by(Supplier.name)
        .all()
    )

    return {
        "id": cos.id,
        "name": user.name,
        "email": user.email,
        "trips": cos.trips,
        "team_manager": team.manager_name if team else None,
        "people_manager": pm.name if pm else None,
        "suppliers": [{"id": s.id, "name": s.name} for s in suppliers],
        "suppliers_count": len(suppliers),
    }
    
    
def get_by_user_id(db, user_id: int):
    from models import Consultant
    return db.query(Consultant).filter(Consultant.user_id == user_id).first()
