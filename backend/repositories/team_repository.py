from typing import Optional
from sqlalchemy.orm import Session, joinedload
from models import Team, PeopleManager, Consultant, User, Assignment


def list_teams(db: Session) -> list[dict]:
    """
    Retourne les teams avec comptages agrégés, sans charger tous les consultants.
    """
    teams = db.query(Team).order_by(Team.manager_name).all()
    result = []
    for t in teams:
        pm_count = db.query(PeopleManager).filter(PeopleManager.team_id == t.id).count()
        cos_count = (
            db.query(Consultant)
            .join(PeopleManager, Consultant.people_manager_id == PeopleManager.id)
            .filter(PeopleManager.team_id == t.id)
            .count()
        )
        result.append({
            "id": t.id,
            "manager_name": t.manager_name,
            "people_managers_count": pm_count,
            "consultants_count": cos_count,
        })
    return result


def get_team_detail(db: Session, team_id: int) -> Optional[dict]:
    """
    Retourne le détail complet d'une team (arborescence PM → COS) avec les
    stats nécessaires pour l'UI (nombre de suppliers par COS).
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        return None

    pms = db.query(PeopleManager).filter(PeopleManager.team_id == team_id).all()

    pm_list = []
    total_consultants = 0
    total_suppliers = 0

    for pm in pms:
        cos_query = (
            db.query(Consultant, User, )
            .join(User, Consultant.user_id == User.id)
            .filter(Consultant.people_manager_id == pm.id)
            .order_by(User.name)
            .all()
        )

        cos_list = []
        for cos, user in cos_query:
            sup_count = (
                db.query(Assignment).filter(Assignment.consultant_id == cos.id).count()
            )
            cos_list.append({
                "id": cos.id,
                "name": user.name,
                "email": user.email,
                "trips": cos.trips,
                "suppliers_count": sup_count,
            })
            total_suppliers += sup_count

        total_consultants += len(cos_list)
        pm_list.append({
            "id": pm.id,
            "name": pm.name,
            "email": pm.email,
            "consultants": cos_list,
        })

    return {
        "id": team.id,
        "manager_name": team.manager_name,
        "people_managers": pm_list,
        "total_consultants": total_consultants,
        "total_suppliers": total_suppliers,
    }