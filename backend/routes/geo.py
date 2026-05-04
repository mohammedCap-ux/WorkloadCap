"""
routes/geo.py
-------------
Endpoints de geolocalisation pour les consultants.

POST /api/geo/closest-docks : top 5 docks les plus proches d'un fournisseur,
                              avec justification courte par LLM.
"""

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.geo import ClosestDocksRequest, ClosestDocksResponse
from services.deps import get_current_user
from services.geo_service import find_closest_docks
from services.llm_service import chat_completion, get_model_info


router = APIRouter(prefix="/api/geo", tags=["geo"])


JUSTIFY_PROMPT = """Tu es un assistant logistique chez Capgemini.

On te donne :
- un fournisseur avec sa position GPS
- une quantite a expedier (peut etre vide)
- une liste deja triee de 5 docks candidats avec leur distance en km

Ton role : ajouter UNE phrase courte de justification pour chaque dock (en francais), basee sur :
- la distance (proche/moyen/eloigne)
- la position relative (meme pays, meme region, transfrontalier)
- la pertinence pour le volume si la quantite est connue

Format de sortie : UNIQUEMENT un JSON valide selon ce schema EXACT :
{
  "top5": [
    {"dock_name": "<nom exact recu>", "reason": "<phrase courte>"}
  ],
  "summary": "<resume global en 1 phrase>"
}

Aucune cle supplementaire. Aucun commentaire. Aucun Markdown. Juste du JSON pur.
"""


def _extract_json(text: str) -> dict:
    """Extrait le JSON d'une reponse LLM (supporte Markdown fences)."""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Reponse LLM non-JSON : {text[:200]}...")


@router.post("/closest-docks", response_model=ClosestDocksResponse)
def closest_docks(
    payload: ClosestDocksRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calcule les 5 docks les plus proches du fournisseur (Haversine),
    puis demande au LLM une justification courte pour chacun.
    """
    if current_user.role not in ("consultant", "manager", "people_manager"):
        raise HTTPException(status_code=403, detail="Acces refuse")

    # 1. Calcul Haversine cote Python (deterministe)
    candidates_dict = [c.model_dump() for c in payload.candidates]
    top5_raw = find_closest_docks(
        payload.supplier_lat,
        payload.supplier_lng,
        candidates_dict,
        top_n=5,
    )

    if not top5_raw:
        raise HTTPException(status_code=400, detail="Aucun dock candidat valide")

    # 2. Construction du prompt utilisateur
    qty_str = f"{payload.quantity}" if payload.quantity is not None else "non precise"
    user_prompt = f"""Fournisseur : {payload.supplier_name}
Position GPS : ({payload.supplier_lat}, {payload.supplier_lng})
Quantite a expedier : {qty_str}

Top 5 docks deja tries par distance croissante :
{json.dumps(top5_raw, ensure_ascii=False, indent=2)}

Genere les justifications pour chaque dock. Retourne UNIQUEMENT le JSON demande.
"""

    # 3. Appel LLM
    try:
        raw_response = chat_completion(
            JUSTIFY_PROMPT, user_prompt, max_tokens=1500, temperature=0.2
        )
        parsed = _extract_json(raw_response)
    except (RuntimeError, ValueError, json.JSONDecodeError) as e:
        # Fallback : on retourne le top5 sans reason si le LLM echoue
        return {
            "top5": [
                {**d, "reason": "Justification IA indisponible"}
                for d in top5_raw
            ],
            "summary": f"Top 5 calcule par distance (LLM indisponible : {str(e)[:80]}).",
            "model_used": get_model_info(),
        }

    # 4. Reconciliation : on rebascule les distances calculees + les reasons LLM
    reasons_by_name = {}
    for item in parsed.get("top5", []):
        name = item.get("dock_name", "").strip()
        reason = item.get("reason", "").strip()
        if name:
            reasons_by_name[name] = reason

    final_top5 = [
        {
            "dock_name": d["dock_name"],
            "lat": d["lat"],
            "lng": d["lng"],
            "distance_km": d["distance_km"],
            "reason": reasons_by_name.get(d["dock_name"], "Sans justification"),
        }
        for d in top5_raw
    ]

    return {
        "top5": final_top5,
        "summary": parsed.get("summary", ""),
        "model_used": get_model_info(),
    }