"""
services/agent_geo_service.py
-----------------------------
Agent IA pour recommander les docks ou prendre un packaging.

Algo :
1. Trouve le fournisseur (via seller + empty_return cofors, les 2 obligatoires)
2. Trouve les liaisons availability pour ce fournisseur + packaging (mode normal)
3. Croise avec stock geo_stock (qty > 0 obligatoire)
4. Si vide : mode fallback_geographic (top 5 docks geographiquement proches qui ont le stock)
5. Calcule distances Haversine
6. LLM : repartition optimale + 1-2 alternatives + justification
"""

import json
import re
from sqlalchemy.orm import Session

from models import GeoSupplier, GeoAvailability, GeoStock, GeoDock
from services.geo_service import haversine_km
from services.llm_service import chat_completion, get_model_info


SYSTEM_PROMPT = """Tu es un expert supply chain chez Capgemini Engineering.
Ta mission : recommander la repartition optimale d'un besoin en packaging entre plusieurs docks/usines.

REGLES METIER :
1. Optimiser COUT et TEMPS : privilegier les docks les PLUS PROCHES geographiquement
2. Si le dock le plus proche a TOUT le stock necessaire -> prendre 100% chez lui (pas de split inutile)
3. Si le 1er dock n'a pas assez -> completer avec le 2eme le plus proche, etc.
4. Eviter les splits inutiles (un dock unique > deux docks pour la meme operation)
5. Tenir compte du stock disponible (ne jamais demander plus que dispo)

FORMAT DE SORTIE : UNIQUEMENT du JSON valide, aucun Markdown, aucune balise.
Schema strict :
{
  "primary": {
    "plan_label": "<label court ex: 'Plan optimal'>",
    "splits": [
      {"dock_name": "<nom exact du dock>", "qty": <nombre>, "percent": <0-100>}
    ],
    "reasoning": "<justification en francais en 1-2 phrases>"
  },
  "alternatives": [
    {
      "plan_label": "<label ex: 'Plan equilibre'>",
      "splits": [{"dock_name": "...", "qty": ..., "percent": ...}],
      "reasoning": "<justification>"
    }
  ],
  "summary": "<recap global en 1 phrase>"
}

Genere TOUJOURS 1 plan primary + 1 a 2 alternatives. Si le besoin est entierement couvrable par 1 seul dock, l'alternative peut proposer un split equilibre 'au cas ou'.

La somme des qty dans chaque plan DOIT egaler le besoin. Les percent doivent sommer a 100.
Aucun dock_name invente : tu ne peux utiliser que les docks fournis dans l'input.
"""


def _extract_json(text: str) -> dict:
    """Extrait JSON d'une reponse LLM (supporte Markdown fences)."""
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
    raise ValueError(f"Reponse LLM non-JSON : {text[:200]}")


def _find_dock_coords(db: Session, dock_name: str):
    """Match tolerant : exact ou tokens majeurs (ex: stock='CSC TRNAVA -DOCK 4M1 ' vs geo_docks='4M1M - CSC TRNAVA -DOCK 4M1')."""
    target = dock_name.strip().lower()
    # 1. Match exact
    found = db.query(GeoDock).filter(GeoDock.name == dock_name.strip()).first()
    if found:
        return found
    # 2. Match tolerant (tous les tokens majeurs presents)
    tokens = [t for t in re.split(r"[\s\-_]+", target) if len(t) > 2]
    all_docks = db.query(GeoDock).all()
    for d in all_docks:
        dl = d.name.lower()
        if all(t in dl for t in tokens):
            return d
    return None


def recommend_docks(
    db: Session,
    packaging_code: str,
    quantity: float,
    seller_cofor: str,
    empty_return_cofor: str,
) -> dict:
    """Logique principale de l'agent."""

    # === 1. Trouver le fournisseur (les 2 cofors obligatoires) ===
    supplier = (
        db.query(GeoSupplier)
        .filter(GeoSupplier.seller_cofor == seller_cofor)
        .filter(GeoSupplier.empty_return_cofor == empty_return_cofor)
        .first()
    )
    if not supplier:
        return {
            "error": "supplier_not_found",
            "message": f"Aucun fournisseur trouve avec seller_cofor='{seller_cofor}' et empty_return_cofor='{empty_return_cofor}'",
        }

    # === 2. Trouver les liaisons availability (mode normal) ===
    avail_lines = (
        db.query(GeoAvailability)
        .filter(GeoAvailability.seller_cofor == seller_cofor)
        .filter(GeoAvailability.empty_return_cofor == empty_return_cofor)
        .filter(GeoAvailability.packaging_id == packaging_code)
        .all()
    )

    # Collecter tous les docks lies (pooling + alternates)
    linked_dock_names = set()
    for a in avail_lines:
        if a.pooling_dock:
            linked_dock_names.add(a.pooling_dock)
        for alt in (a.alternates or []):
            if alt:
                linked_dock_names.add(alt)

    # === 3. Croiser avec stock (qty > 0) ===
    candidates = []
    mode = "supplier_chain"

    if linked_dock_names:
        # Pour chaque dock lie, chercher dans le stock
        for dock_name_link in linked_dock_names:
            stock_rows = (
                db.query(GeoStock)
                .filter(GeoStock.packaging_code == packaging_code)
                .filter(GeoStock.qty_available > 0)
                .all()
            )
            for sr in stock_rows:
                if _docks_match(dock_name_link, sr.dock_name):
                    dock_geo = _find_dock_coords(db, sr.dock_name)
                    if dock_geo:
                        candidates.append({
                            "dock_name": sr.dock_name,
                            "qty_available": sr.qty_available,
                            "lat": dock_geo.lat,
                            "lng": dock_geo.lng,
                        })
                        break  # 1 fois suffit pour ce link

    # === 4. Fallback geographique si vide ===
    if not candidates:
        mode = "fallback_geographic"
        all_stock = (
            db.query(GeoStock)
            .filter(GeoStock.packaging_code == packaging_code)
            .filter(GeoStock.qty_available > 0)
            .all()
        )
        for sr in all_stock:
            dock_geo = _find_dock_coords(db, sr.dock_name)
            if dock_geo:
                candidates.append({
                    "dock_name": sr.dock_name,
                    "qty_available": sr.qty_available,
                    "lat": dock_geo.lat,
                    "lng": dock_geo.lng,
                })

    if not candidates:
        return {
            "error": "no_stock",
            "message": f"Aucun dock n'a de stock disponible pour packaging '{packaging_code}'",
        }

    # === 5. Calcul distances + tri ===
    if supplier.lat is not None and supplier.lng is not None:
        for c in candidates:
            c["distance_km"] = round(haversine_km(supplier.lat, supplier.lng, c["lat"], c["lng"]), 1)
        candidates.sort(key=lambda x: x["distance_km"])
    else:
        # Fournisseur sans coords : tri par stock dispo descendant
        for c in candidates:
            c["distance_km"] = None
        candidates.sort(key=lambda x: -x["qty_available"])

    # Si fallback geographique : top 5
    if mode == "fallback_geographic":
        candidates = candidates[:5]

    # === 6. Appel LLM ===
    user_prompt = f"""Fournisseur : {supplier.supplier_name}
Position GPS fournisseur : ({supplier.lat}, {supplier.lng})
Packaging recherche : {packaging_code}
Quantite besoin : {quantity}
Mode : {mode}

Docks candidats (deja tries par distance croissante) :
{json.dumps(candidates, ensure_ascii=False, indent=2)}

Genere la repartition optimale en respectant les regles metier. Retourne UNIQUEMENT le JSON demande.
"""

    try:
        raw = chat_completion(SYSTEM_PROMPT, user_prompt, max_tokens=2000, temperature=0.3)
        parsed = _extract_json(raw)
    except Exception as e:
        # Fallback simple : un plan glouton sans LLM
        return _fallback_plan(supplier, candidates, quantity, mode, str(e))

    return {
        "supplier": {
            "name": supplier.supplier_name,
            "city": supplier.city,
            "country": supplier.country,
            "seller_cofor": supplier.seller_cofor,
            "empty_return_cofor": supplier.empty_return_cofor,
        },
        "packaging_code": packaging_code,
        "quantity": quantity,
        "mode": mode,
        "candidates_count": len(candidates),
        "primary": parsed.get("primary"),
        "alternatives": parsed.get("alternatives", []),
        "summary": parsed.get("summary", ""),
        "model_used": get_model_info(),
    }


def _docks_match(name1: str, name2: str) -> bool:
    """Match tolerant entre 2 noms de docks (ex: 'CSC TRNAVA -DOCK 4M1 ' et '4M1M - CSC TRNAVA -DOCK 4M1')."""
    n1 = name1.strip().lower()
    n2 = name2.strip().lower()
    if n1 == n2:
        return True
    tokens1 = set(t for t in re.split(r"[\s\-_]+", n1) if len(t) > 2)
    tokens2 = set(t for t in re.split(r"[\s\-_]+", n2) if len(t) > 2)
    if not tokens1 or not tokens2:
        return False
    common = tokens1 & tokens2
    return len(common) >= min(2, min(len(tokens1), len(tokens2)))


def _fallback_plan(supplier, candidates, quantity, mode, error_msg):
    """Plan glouton si LLM indisponible : remplit dans l'ordre."""
    splits = []
    remaining = quantity
    for c in candidates:
        if remaining <= 0:
            break
        take = min(remaining, c["qty_available"])
        splits.append({
            "dock_name": c["dock_name"],
            "qty": round(take, 2),
            "percent": round(take / quantity * 100, 1),
        })
        remaining -= take

    return {
        "supplier": {
            "name": supplier.supplier_name,
            "city": supplier.city,
            "country": supplier.country,
            "seller_cofor": supplier.seller_cofor,
            "empty_return_cofor": supplier.empty_return_cofor,
        },
        "packaging_code": "",
        "quantity": quantity,
        "mode": mode,
        "candidates_count": len(candidates),
        "primary": {
            "plan_label": "Plan glouton (LLM indisponible)",
            "splits": splits,
            "reasoning": "Repartition automatique du plus proche au plus eloigne.",
        },
        "alternatives": [],
        "summary": f"Plan calcule sans IA (LLM indisponible : {error_msg[:80]}).",
        "model_used": "fallback",
    }