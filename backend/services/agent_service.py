"""
agent_service.py
----------------
Agent IA pour l'affectation automatique de fournisseurs aux consultants.

Objectif A : Repartir une liste de fournisseurs (existants ou nouveaux)
entre les consultants, avec equilibrage de charge.

Le manager valide ensuite les propositions via un tableau checkbox.
"""

import json
import re
from sqlalchemy.orm import Session
from models import Supplier, Consultant, User
from services.workload_service import compute_consultant_scoring, get_global_stats
from services.llm_service import chat_completion


SYSTEM_PROMPT = """Tu es un assistant d'affectation de fournisseurs a des consultants dans une equipe de supply chain chez Capgemini.

Ton role : proposer une repartition EQUILIBREE de nouveaux fournisseurs sur les consultants disponibles.

Regles strictes :
1. Privilegier les consultants avec peu d'affectations actuelles et faible charge hebdomadaire
2. Eviter les consultants en surcharge (load_ratio > 1.0)
3. Si plus de fournisseurs que de consultants libres : autoriser plusieurs fournisseurs par consultant, en restant equitable
4. Utiliser UNIQUEMENT les consultant_id fournis dans le contexte
5. Justifier chaque choix en 1 phrase courte (ex: "Aucune affectation, pleinement disponible")

Format de sortie : tu dois repondre avec UNIQUEMENT un JSON valide (aucun texte avant ou apres), selon ce schema EXACT :

{
  "proposals": [
    {
      "supplier_name": "<nom exact du fournisseur>",
      "consultant_id": <id entier>,
      "consultant_name": "<nom du consultant>",
      "reason": "<justification courte>"
    }
  ],
  "summary": "<resume global en 1 phrase>"
}

Aucune cle supplementaire. Aucun commentaire. Aucun Markdown. Juste du JSON pur.
"""


def build_user_prompt(suppliers_to_assign: list[str], scoring: list[dict], stats: dict) -> str:
    """Construit le prompt utilisateur avec toutes les donnees metier."""
    consultants_payload = [
        {
            "consultant_id": c["consultant_id"],
            "consultant_name": c["consultant_name"],
            "nb_affectations": c["nb_affectations"],
            "charge_min_semaine": c["charge_min"],
            "dispo_min_semaine": c["residual_min"],
            "load_ratio": c["load_ratio"],
        }
        for c in scoring
    ]

    return f"""Contexte de l'equipe (ratios de charge : 0 = dispo, 1 = plein, >1 = surcharge) :
Ratio moyen : {stats['avg_load_ratio']} | Ratio max : {stats['max_load_ratio']} | Desequilibre : {stats['imbalance']}

Consultants disponibles (tries par disponibilite decroissante) :
{json.dumps(consultants_payload, ensure_ascii=False, indent=2)}

Fournisseurs a repartir :
{json.dumps(suppliers_to_assign, ensure_ascii=False, indent=2)}

Propose une affectation equilibree respectant les regles. Retourne UNIQUEMENT le JSON demande.
"""


def extract_json(text: str) -> dict:
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

    raise ValueError(f"Impossible d'extraire du JSON de la reponse LLM : {text[:200]}...")


def propose_assignments(db: Session, supplier_names: list[str]) -> dict:
    """
    Fonction principale de l'agent.
    Entree : liste de noms de fournisseurs a repartir
    Sortie : dict {proposals, summary, model_used, stats}
    """
    if not supplier_names:
        return {"proposals": [], "summary": "Aucun fournisseur a repartir.", "model_used": ""}

    scoring = compute_consultant_scoring(db)
    stats = get_global_stats(scoring)

    if not scoring:
        return {"proposals": [], "summary": "Aucun consultant disponible.", "model_used": ""}

    user_prompt = build_user_prompt(supplier_names, scoring, stats)

    from services.llm_service import get_model_info
    raw_response = chat_completion(SYSTEM_PROMPT, user_prompt, max_tokens=3000, temperature=0.2)

    try:
        parsed = extract_json(raw_response)
    except (ValueError, json.JSONDecodeError) as e:
        return {
            "proposals": [],
            "summary": f"Erreur : le LLM n'a pas retourne un JSON valide ({str(e)[:100]}).",
            "model_used": get_model_info(),
            "raw_response": raw_response[:500],
        }

    valid_ids = {c["consultant_id"] for c in scoring}
    validated_proposals = []
    for p in parsed.get("proposals", []):
        if p.get("consultant_id") in valid_ids:
            validated_proposals.append(p)

    return {
        "proposals": validated_proposals,
        "summary": parsed.get("summary", ""),
        "model_used": get_model_info(),
        "stats": stats,
    }


def confirm_assignments(db: Session, proposals: list[dict]) -> dict:
    """
    Applique les propositions acceptees par le manager.
    Retourne : {created: N, errors: [...]}
    """
    from models import Assignment

    created = 0
    errors = []

    for p in proposals:
        supplier_name = p.get("supplier_name", "").strip()
        consultant_id = p.get("consultant_id")

        if not supplier_name or not consultant_id:
            errors.append(f"Proposition invalide : {p}")
            continue

        supplier = db.query(Supplier).filter(Supplier.name == supplier_name).first()
        if not supplier:
            supplier = Supplier(name=supplier_name)
            db.add(supplier)
            db.flush()

        consultant = db.query(Consultant).filter(Consultant.id == consultant_id).first()
        if not consultant:
            errors.append(f"Consultant id={consultant_id} introuvable")
            continue

        existing = (
            db.query(Assignment)
            .filter(Assignment.supplier_id == supplier.id)
            .filter(Assignment.consultant_id == consultant.id)
            .first()
        )
        if existing:
            errors.append(f"Deja affecte : {supplier_name} -> consultant {consultant_id}")
            continue

        assignment = Assignment(
            supplier_id=supplier.id,
            consultant_id=consultant.id,
            assigned_by="ai",
        )
        db.add(assignment)
        created += 1

    db.commit()
    return {"created": created, "errors": errors}