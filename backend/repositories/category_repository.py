from sqlalchemy.orm import Session, joinedload
from models import Category


def list_all(db: Session) -> list[dict]:
    categories = (
        db.query(Category)
        .options(joinedload(Category.tasks))
        .order_by(Category.id)
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "icon": c.icon,
            "tasks": [
                {"id": t.id, "name": t.name, "standard_duration_min": t.standard_duration_min}
                for t in sorted(c.tasks, key=lambda x: x.id)
            ],
        }
        for c in categories
    ]
    
    
def get_by_user_id(db, user_id: int):
 from models import Consultant
 return db.query(Consultant).filter(Consultant.user_id == user_id).first()