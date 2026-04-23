from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import WorkloadDeclaration, Consultant, User, Task, Category


def list_for_consultant(
    db: Session,
    consultant_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
) -> list[dict]:
    query = (
        db.query(WorkloadDeclaration, User, Task, Category)
        .join(Consultant, WorkloadDeclaration.consultant_id == Consultant.id)
        .join(User, Consultant.user_id == User.id)
        .join(Task, WorkloadDeclaration.task_id == Task.id)
        .join(Category, Task.category_id == Category.id)
        .filter(WorkloadDeclaration.consultant_id == consultant_id)
    )
    if date_from:
        query = query.filter(WorkloadDeclaration.date >= date_from)
    if date_to:
        query = query.filter(WorkloadDeclaration.date <= date_to)

    rows = (
        query.order_by(WorkloadDeclaration.date.desc(), WorkloadDeclaration.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": d.id,
            "consultant_id": d.consultant_id,
            "consultant_name": u.name,
            "task_id": d.task_id,
            "task_name": t.name,
            "category_name": c.name,
            "date": d.date,
            "standard_duration_min": d.standard_duration_min,
            "real_duration_min": d.real_duration_min,
            "status": d.status,
            "created_at": d.created_at,
        }
        for d, u, t, c in rows
    ]


def create(
    db: Session,
    consultant_id: int,
    task_id: int,
    date_val: date,
    real_duration_min: int,
    status: str = "done",
) -> WorkloadDeclaration:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise ValueError(f"Task {task_id} introuvable")

    decl = WorkloadDeclaration(
        consultant_id=consultant_id,
        task_id=task_id,
        date=date_val,
        standard_duration_min=task.standard_duration_min,
        real_duration_min=real_duration_min,
        status=status,
    )
    db.add(decl)
    db.commit()
    db.refresh(decl)
    return decl


def update(
    db: Session,
    declaration_id: int,
    real_duration_min: Optional[int] = None,
    status: Optional[str] = None,
) -> Optional[WorkloadDeclaration]:
    decl = db.query(WorkloadDeclaration).filter(WorkloadDeclaration.id == declaration_id).first()
    if not decl:
        return None
    if real_duration_min is not None:
        decl.real_duration_min = real_duration_min
    if status is not None:
        decl.status = status
    db.commit()
    db.refresh(decl)
    return decl


def delete(db: Session, declaration_id: int) -> bool:
    decl = db.query(WorkloadDeclaration).filter(WorkloadDeclaration.id == declaration_id).first()
    if not decl:
        return False
    db.delete(decl)
    db.commit()
    return True


def get_by_id(db: Session, declaration_id: int) -> Optional[WorkloadDeclaration]:
    return db.query(WorkloadDeclaration).filter(WorkloadDeclaration.id == declaration_id).first()


def get_stats(
    db: Session,
    consultant_id: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    query = db.query(WorkloadDeclaration).filter(
        WorkloadDeclaration.consultant_id == consultant_id
    )
    if date_from:
        query = query.filter(WorkloadDeclaration.date >= date_from)
    if date_to:
        query = query.filter(WorkloadDeclaration.date <= date_to)

    total_decl = query.count()
    total_real = query.with_entities(
        func.coalesce(func.sum(WorkloadDeclaration.real_duration_min), 0)
    ).scalar()
    total_std = query.with_entities(
        func.coalesce(func.sum(WorkloadDeclaration.standard_duration_min), 0)
    ).scalar()
    done = query.filter(WorkloadDeclaration.status == "done").count()
    ongoing = query.filter(WorkloadDeclaration.status == "ongoing").count()

    efficiency = 0.0
    if total_real > 0:
        efficiency = round((total_std / total_real) * 100, 1)

    return {
        "total_declarations": total_decl,
        "total_real_min": total_real,
        "total_standard_min": total_std,
        "done_count": done,
        "ongoing_count": ongoing,
        "efficiency_pct": efficiency,
    }