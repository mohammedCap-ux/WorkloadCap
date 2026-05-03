"""
workload_service.py
-------------------
Service de scoring de charge par consultant.
Calcule pour chaque consultant :
  - Nombre d'affectations actuelles
  - Charge declaree cette semaine (en minutes)
  - Capacite residuelle (2400 min / semaine par defaut)
  - Ratio de charge (0 = sous-charge, 1 = pleine charge, >1 = surcharge)

Utilise par l'agent IA pour proposer des affectations equilibrees.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Consultant, User, Assignment, WorkloadDeclaration


# Capacite theorique d'un consultant par semaine
WEEKLY_CAPACITY_MIN = 2400  # 8h x 5 jours


def get_current_week_range() -> tuple[date, date]:
    """Retourne (lundi, vendredi) de la semaine en cours."""
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def compute_consultant_scoring(db: Session) -> list[dict]:
    """
    Retourne pour chaque consultant son scoring de charge.
    Resultat trie par capacite residuelle DECROISSANTE (le plus dispo en premier).
    """
    monday, friday = get_current_week_range()

    # Recuperer tous les consultants avec leur nom
    consultants = (
        db.query(Consultant, User)
        .join(User, Consultant.user_id == User.id)
        .filter(User.role == "consultant")
        .all()
    )

    # Compter les affectations par consultant (en une seule requete)
    assignments_count = dict(
        db.query(Assignment.consultant_id, func.count(Assignment.id))
        .group_by(Assignment.consultant_id)
        .all()
    )

    # Sommer la charge declaree cette semaine par consultant (en une seule requete)
    weekly_charge = dict(
        db.query(
            WorkloadDeclaration.consultant_id,
            func.coalesce(func.sum(WorkloadDeclaration.real_duration_min), 0),
        )
        .filter(WorkloadDeclaration.date >= monday)
        .filter(WorkloadDeclaration.date <= friday)
        .group_by(WorkloadDeclaration.consultant_id)
        .all()
    )

    result = []
    for c, u in consultants:
        nb_aff = assignments_count.get(c.id, 0)
        charge_min = weekly_charge.get(c.id, 0)
        residual_min = max(0, WEEKLY_CAPACITY_MIN - charge_min)
        load_ratio = round(charge_min / WEEKLY_CAPACITY_MIN, 2) if WEEKLY_CAPACITY_MIN > 0 else 0

        result.append({
            "consultant_id": c.id,
            "consultant_name": u.name,
            "nb_affectations": nb_aff,
            "charge_min": charge_min,
            "residual_min": residual_min,
            "load_ratio": load_ratio,
            "capacity_min": WEEKLY_CAPACITY_MIN,
        })

    # Trier par capacite residuelle decroissante (le plus dispo en premier)
    result.sort(key=lambda x: x["residual_min"], reverse=True)
    return result


def get_global_stats(scoring: list[dict]) -> dict:
    """
    Retourne les stats globales sur l'equipe :
      - Moyenne de charge
      - Ecart type entre le plus charge et le moins charge (pour mesurer le desequilibre)
    """
    if not scoring:
        return {"avg_load_ratio": 0, "max_load_ratio": 0, "min_load_ratio": 0, "imbalance": 0}

    ratios = [c["load_ratio"] for c in scoring]
    avg = sum(ratios) / len(ratios)
    max_r = max(ratios)
    min_r = min(ratios)

    return {
        "avg_load_ratio": round(avg, 2),
        "max_load_ratio": max_r,
        "min_load_ratio": min_r,
        "imbalance": round(max_r - min_r, 2),
    }