"""
app.py — WorkloadGeo API (Backend complet)
===========================================
Routes 1-17  : existantes (tâches, KPIs, fournisseurs)
Routes 18-22 : déclarations V2 (format frontend)
Routes 23-27 : gestion d'équipe (membres + réaffectations)
Routes 28-32 : congés et absences
Routes 33-37 : prévisions calendrier
Routes 38-40 : notes libres
Routes 41-44 : affectations fournisseurs ↔ COS
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os

# ══════════════════════════════════════════════════════
# IMPORTS MODULES INTERNES
# ══════════════════════════════════════════════════════
from utils.database import (
    save_declaration,
    get_user_history,
    get_all_today,
    get_all_declarations,
)
from utils.declarations_v2 import (
    save_declaration_rows,
    get_declarations,
    update_declaration_status,
    get_ongoing,
    get_historique,
    get_charge_par_consultant,
)
from utils.equipe import (
    get_all_membres,
    add_membre,
    update_membre,
    delete_membre,
    get_all_overrides,
    add_override,
    delete_override,
)
from utils.conges import (
    get_conges,
    add_conge,
    delete_conge,
    get_conges_equipe,
)
from utils.previsions import (
    get_previsions,
    save_previsions,
    save_previsions_bulk,
    delete_previsions,
    get_previsions_equipe,
)
from utils.notes import (
    get_notes,
    save_notes,
    delete_notes,
)
from utils.affectations import (
    get_all_affectations,
    add_affectation,
    update_affectation,
    delete_affectation,
)
from utils.agent_affectation import (
    affecter_fournisseur,
    affecter_nouveau_cos,
    kaizen_recalibrage,
    dashboard_agent,
)
from utils.kpis import (
    temps_cycle_reel_vs_standard,
    taux_utilisation,
    goulots_etranglement,
    pareto_taches,
    tendance_hebdo,
    rendement_consultant,
    trs_oee,
    lissage_charge,
    ordonnancement_lpt,
    ordonnancement_ia,
)


# ══════════════════════════════════════════════════════
# APP FASTAPI
# ══════════════════════════════════════════════════════
app = FastAPI(
    title="WorkloadGeo API",
    version="2.0",
    description="Backend complet — Déclarations, KPIs, Équipe, Congés, Prévisions, Affectations",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


# ══════════════════════════════════════════════════════
# MODELES PYDANTIC
# ══════════════════════════════════════════════════════

# --- Déclarations V1 (original) ---
class TacheValidee(BaseModel):
    nom: str
    duree_base: int
    frequence: int
    duree_totale: int
    duree_reelle: int


class DeclarationJournee(BaseModel):
    user_email: str
    user_name: str
    taches: list[TacheValidee]
    total_min: int


# --- Déclarations V2 (format frontend) ---
class DeclarationRowV2(BaseModel):
    Date: str = ""
    Categorie: str = ""
    Tache: str = ""
    Duree_Standard_min: int = 0
    Duree_Reelle_min: int = 0
    Frequence: int = 1
    Occurrence: int = 1
    Seller_Cofor: str = ""
    Pack: str = ""
    Load_ID: str = ""
    TO: str = ""
    DN_Number: str = ""
    Status: str = "Ongoing"
    XF_Code: str = ""
    Livrable: str = ""


class DeclarationBatchV2(BaseModel):
    user_email: str
    user_name: str
    rows: list[dict]  # Format libre pour correspondre exactement au frontend


class UpdateStatusRequest(BaseModel):
    user_email: str
    tache: str
    date_decl: str
    seller: str = ""
    new_status: str = "Processed"
    duree_consacree: int = None
    commentaire: str = None


# --- Équipe ---
class MembreCreate(BaseModel):
    name: str
    role: str = "consultant"
    pm: str = ""
    manager: str = ""


class MembreUpdate(BaseModel):
    name: str = None
    role: str = None
    pm: str = None


class OverrideCreate(BaseModel):
    action_type: str  # "move" ou "add"
    cos_name: str
    to_pm: str


# --- Congés ---
class CongeCreate(BaseModel):
    user_email: str
    user_name: str
    dates: list[str]
    type_absence: str = "Conge"


class CongeDelete(BaseModel):
    user_email: str
    dates: list[str]


# --- Prévisions ---
class PrevisionSave(BaseModel):
    user_email: str
    date_key: str
    taches: list[dict]  # [{task: str, freq: int}]


class PrevisionBulk(BaseModel):
    user_email: str
    previsions: dict  # {date_key: [{task, freq}]}


class PrevisionDelete(BaseModel):
    user_email: str
    dates: list[str]


# --- Notes ---
class NoteSave(BaseModel):
    user_email: str
    dates: list[str]
    texte: str


class NoteDelete(BaseModel):
    user_email: str
    dates: list[str]


# --- Affectations ---
class AffectationCreate(BaseModel):
    supplier: str
    cos_name: str


class AffectationUpdate(BaseModel):
    supplier: str = None
    cos_name: str = None


# --- Agent IA ---
class AgentAffecterFournisseurRequest(BaseModel):
    supplier_name: str
    estimated_trips: int = 0
    manager_filter: str = None
    weights: dict = None


class AgentAffecterCosRequest(BaseModel):
    nouveau_cos_name: str
    nouveau_cos_email: str = ""
    nb_fournisseurs_a_transferer: int = 5


# ══════════════════════════════════════════════════════
# ROUTE 1 : Test serveur
# ══════════════════════════════════════════════════════
@app.get("/")
def accueil():
    return {"message": "WorkloadGeo API v2 fonctionne !", "version": "2.0"}


# ══════════════════════════════════════════════════════
# ROUTE 2 : Récupérer la liste des tâches (Excel)
# ══════════════════════════════════════════════════════
@app.get("/api/taches")
def get_taches():
    try:
        fichier = os.path.join(DATA_DIR, "Workload_vFinal_1.xlsx")
        df = pd.read_excel(fichier)
        df["Tâche"] = df["Tâche"].ffill()
        df["Durée (min)"] = (df["Durée (H)"] * 60).round(0).fillna(0).astype(int)
        resultat = []
        for categorie, groupe in df.groupby("Tâche", sort=False):
            taches = []
            for _, ligne in groupe.iterrows():
                taches.append({
                    "nom": ligne["Micro tâche"],
                    "duree_min": int(ligne["Durée (min)"]),
                })
            resultat.append({"categorie": categorie, "taches": taches})
        return resultat
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTE 3 : Valider une journée V1 (format original)
# ══════════════════════════════════════════════════════
@app.post("/api/valider-journee")
def valider_journee(declaration: DeclarationJournee):
    try:
        taches_dict = [t.model_dump() for t in declaration.taches]
        return save_declaration(
            user_email=declaration.user_email,
            user_name=declaration.user_name,
            taches=taches_dict,
            total_min=declaration.total_min,
        )
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTE 4 : Historique d'un consultant
# ══════════════════════════════════════════════════════
@app.get("/api/historique/{user_email}")
def historique(user_email: str):
    try:
        return get_user_history(user_email)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTE 5 : Vue Manager — déclarations du jour
# ══════════════════════════════════════════════════════
@app.get("/api/manager/aujourd-hui")
def manager_aujourd_hui():
    try:
        return get_all_today()
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTE 6 : Toutes les déclarations
# ══════════════════════════════════════════════════════
@app.get("/api/declarations")
def toutes_declarations():
    try:
        return get_all_declarations()
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 7-11 : KPIs de base
# ══════════════════════════════════════════════════════
@app.get("/api/kpis/temps-cycle")
def kpi_temps_cycle():
    try:
        return temps_cycle_reel_vs_standard()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/utilisation")
def kpi_utilisation():
    try:
        return taux_utilisation()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/goulots")
def kpi_goulots():
    try:
        return goulots_etranglement()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/pareto")
def kpi_pareto():
    try:
        return pareto_taches()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/tendance")
def kpi_tendance(user_email: str = None):
    try:
        return tendance_hebdo(user_email)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 12-16 : KPIs avancés
# ══════════════════════════════════════════════════════
@app.get("/api/kpis/rendement")
def kpi_rendement():
    try:
        return rendement_consultant()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/trs")
def kpi_trs():
    try:
        return trs_oee()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/lissage")
def kpi_lissage():
    try:
        return lissage_charge()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/ordonnancement-lpt")
def kpi_ordonnancement_lpt():
    try:
        return ordonnancement_lpt()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/kpis/ordonnancement-ia")
def kpi_ordonnancement_ia():
    try:
        return ordonnancement_ia()
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTE 17 : Fournisseurs (STLA + FCA_FAPOL)
# ══════════════════════════════════════════════════════
@app.get("/api/fournisseurs")
def get_fournisseurs(
    manager: str = None,
    cos: str = None,
    perimetre: str = None,
):
    try:
        resultats = []

        fichier_stla = os.path.join(DATA_DIR, "STLA.xlsx")
        df_stla = pd.read_excel(fichier_stla, dtype=str).fillna("")
        for _, row in df_stla.iterrows():
            resultats.append({
                "perimetre": "NEW",
                "tripcode": row.get("TRIPCODE", "").strip(),
                "sector": row.get("SECTOR", "").strip(),
                "manager": row.get("MANAGER", "").strip(),
                "cos": row.get("I FAST COS", "").strip(),
                "xf_code": row.get("XF CODE", "").strip(),
                "seller_cofor": row.get("SELLER COFOR", "").strip(),
                "shipper_cofor": row.get("SHIPPER COFOR", "").strip(),
                "empty_return_cofor": row.get("EMPTY RETURN COFOR", "").strip(),
                "supplier": row.get("SUPPLIER", "").strip(),
            })

        fichier_fca = os.path.join(DATA_DIR, "FCA_FAPOL.xlsx")
        df_fca = pd.read_excel(fichier_fca, dtype=str).fillna("")
        for _, row in df_fca.iterrows():
            resultats.append({
                "perimetre": "OLD",
                "tripcode": "",
                "sector": row.get("SECTOR", "").strip(),
                "manager": row.get("MANAGER", "").strip(),
                "cos": row.get("COS", "").strip(),
                "xf_code": row.get("XF CODE", "").strip(),
                "seller_cofor": "",
                "shipper_cofor": "",
                "empty_return_cofor": "",
                "supplier": row.get("SUPPLIER", "").strip(),
            })

        if manager:
            resultats = [r for r in resultats if r["manager"].lower() == manager.lower()]
        if cos:
            resultats = [r for r in resultats if r["cos"].lower() == cos.lower()]
        if perimetre:
            resultats = [r for r in resultats if r["perimetre"].upper() == perimetre.upper()]

        return {"total": len(resultats), "fournisseurs": resultats}
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════════════
#
#   NOUVELLES ROUTES — ÉTAPE 2
#
# ══════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════
# ROUTES 18-22 : Déclarations V2 (format frontend)
# ══════════════════════════════════════════════════════

@app.post("/api/v2/declarations")
def sauvegarder_declarations_v2(batch: DeclarationBatchV2):
    """Route 18 : Sauvegarder un lot de déclarations (format frontend exact)."""
    try:
        return save_declaration_rows(
            user_email=batch.user_email,
            user_name=batch.user_name,
            rows=batch.rows,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/v2/declarations")
def lire_declarations_v2(
    user_email: str = None,
    consultant: str = None,
    date: str = None,
    mois: str = None,
    annee: str = None,
    status: str = None,
):
    """Route 19 : Lire les déclarations avec filtres."""
    try:
        return get_declarations(
            user_email=user_email,
            consultant=consultant,
            date_str=date,
            mois=mois,
            annee=annee,
            status=status,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.put("/api/v2/declarations/status")
def maj_status_declaration(req: UpdateStatusRequest):
    """Route 20 : Mettre à jour le status d'une tâche (Ongoing → Processed)."""
    try:
        return update_declaration_status(
            user_email=req.user_email,
            tache=req.tache,
            date_decl=req.date_decl,
            seller=req.seller,
            new_status=req.new_status,
            duree_consacree=req.duree_consacree,
            commentaire=req.commentaire,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/v2/ongoing")
def lire_ongoing(user_email: str = None):
    """Route 21 : Récupérer les tâches Ongoing."""
    try:
        return get_ongoing(user_email)
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/v2/charge-par-consultant")
def charge_par_consultant():
    """Route 22 : Charge agrégée par consultant (pour l'agent IA)."""
    try:
        return get_charge_par_consultant()
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 23-27 : Gestion d'équipe
# ══════════════════════════════════════════════════════

@app.get("/api/equipe")
def lire_equipe():
    """Route 23 : Liste des membres ajoutés."""
    try:
        return get_all_membres()
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/equipe")
def ajouter_membre(membre: MembreCreate):
    """Route 24 : Ajouter un membre."""
    try:
        return add_membre(
            name=membre.name,
            role=membre.role,
            pm=membre.pm,
            manager=membre.manager,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.put("/api/equipe/{membre_id}")
def modifier_membre(membre_id: int, membre: MembreUpdate):
    """Route 25 : Modifier un membre."""
    try:
        return update_membre(membre_id, name=membre.name, role=membre.role, pm=membre.pm)
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/equipe/{membre_id}")
def supprimer_membre(membre_id: int):
    """Route 26 : Supprimer un membre."""
    try:
        return delete_membre(membre_id)
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/equipe/overrides")
def lire_overrides():
    """Route 27a : Liste des réaffectations PM ↔ COS."""
    try:
        return get_all_overrides()
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/equipe/overrides")
def ajouter_override(override: OverrideCreate):
    """Route 27b : Créer une réaffectation."""
    try:
        return add_override(
            action_type=override.action_type,
            cos_name=override.cos_name,
            to_pm=override.to_pm,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/equipe/overrides/{override_id}")
def supprimer_override(override_id: int):
    """Route 27c : Annuler une réaffectation."""
    try:
        return delete_override(override_id)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 28-32 : Congés et absences
# ══════════════════════════════════════════════════════

@app.get("/api/conges")
def lire_conges(
    user_email: str = None,
    mois: str = None,
    annee: str = None,
):
    """Route 28 : Récupérer les congés (avec filtres)."""
    try:
        return get_conges(user_email=user_email, mois=mois, annee=annee)
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/conges")
def ajouter_conge(conge: CongeCreate):
    """Route 29 : Déclarer des jours d'absence."""
    try:
        return add_conge(
            user_email=conge.user_email,
            user_name=conge.user_name,
            dates=conge.dates,
            type_absence=conge.type_absence,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/conges")
def retirer_conge(conge: CongeDelete):
    """Route 30 : Retirer des jours d'absence."""
    try:
        return delete_conge(user_email=conge.user_email, dates=conge.dates)
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/conges/equipe")
def conges_equipe():
    """Route 31 : Vue manager — congés de toute l'équipe."""
    try:
        return get_conges_equipe()
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 33-37 : Prévisions calendrier
# ══════════════════════════════════════════════════════

@app.get("/api/previsions/{user_email}")
def lire_previsions(user_email: str, mois: str = None, annee: str = None):
    """Route 33 : Récupérer les prévisions d'un consultant."""
    try:
        return get_previsions(user_email, mois=mois, annee=annee)
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/previsions")
def sauvegarder_prevision(prev: PrevisionSave):
    """Route 34 : Sauvegarder les prévisions d'un jour."""
    try:
        return save_previsions(
            user_email=prev.user_email,
            date_key=prev.date_key,
            taches=prev.taches,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/previsions/bulk")
def sauvegarder_previsions_bulk(prev: PrevisionBulk):
    """Route 35 : Sauvegarder les prévisions de plusieurs jours."""
    try:
        return save_previsions_bulk(
            user_email=prev.user_email,
            previsions=prev.previsions,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/previsions")
def supprimer_previsions(prev: PrevisionDelete):
    """Route 36 : Supprimer les prévisions de certains jours."""
    try:
        return delete_previsions(user_email=prev.user_email, dates=prev.dates)
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/previsions-equipe")
def previsions_equipe(mois: str = None, annee: str = None):
    """Route 37 : Vue manager — prévisions de toute l'équipe."""
    try:
        return get_previsions_equipe(mois=mois, annee=annee)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 38-40 : Notes libres
# ══════════════════════════════════════════════════════

@app.get("/api/notes/{user_email}")
def lire_notes(user_email: str):
    """Route 38 : Récupérer les notes d'un consultant."""
    try:
        return get_notes(user_email)
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/notes")
def ajouter_notes(note: NoteSave):
    """Route 39 : Ajouter une note à un ou plusieurs jours."""
    try:
        return save_notes(user_email=note.user_email, dates=note.dates, texte=note.texte)
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/notes")
def supprimer_notes(note: NoteDelete):
    """Route 40 : Supprimer des notes."""
    try:
        return delete_notes(user_email=note.user_email, dates=note.dates)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 41-44 : Affectations fournisseurs ↔ COS
# ══════════════════════════════════════════════════════

@app.get("/api/affectations")
def lire_affectations():
    """Route 41 : Liste de toutes les affectations."""
    try:
        return get_all_affectations()
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/affectations")
def ajouter_affectation(aff: AffectationCreate):
    """Route 42 : Affecter un fournisseur à un COS."""
    try:
        return add_affectation(supplier=aff.supplier, cos_name=aff.cos_name)
    except Exception as e:
        return {"erreur": str(e)}


@app.put("/api/affectations/{affectation_id}")
def modifier_affectation(affectation_id: int, aff: AffectationUpdate):
    """Route 43 : Modifier une affectation."""
    try:
        return update_affectation(
            affectation_id=affectation_id,
            supplier=aff.supplier,
            cos_name=aff.cos_name,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.delete("/api/affectations/{affectation_id}")
def supprimer_affectation(affectation_id: int):
    """Route 44 : Supprimer une affectation."""
    try:
        return delete_affectation(affectation_id)
    except Exception as e:
        return {"erreur": str(e)}


# ══════════════════════════════════════════════════════
# ROUTES 45-49 : Agent IA d'affectation (Lean Office)
# ══════════════════════════════════════════════════════

@app.post("/api/agent/affecter-fournisseur")
def agent_affecter_fournisseur(req: AgentAffecterFournisseurRequest):
    """
    Route 45 : Recommander le COS optimal pour un nouveau fournisseur.
    
    Score(F, C) =
        w1 × Capacité_résiduelle     (Heijunka)
      + w2 × Takt_après_affectation  (Takt Time)
      + w3 × Disponibilité_4_sem     (Heijunka temporel)
      - w4 × Écart_type_équipe       (Lissage global)
    """
    try:
        return affecter_fournisseur(
            supplier_name=req.supplier_name,
            estimated_trips=req.estimated_trips,
            weights=req.weights,
            manager_filter=req.manager_filter,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.post("/api/agent/affecter-cos")
def agent_affecter_cos(req: AgentAffecterCosRequest):
    """
    Route 46 : Affecter un nouveau COS à une équipe + plan de rééquilibrage.
    
    1. Identifie le PM avec le plus fort déséquilibre
    2. Rattache le nouveau COS
    3. Propose un plan de transfert de fournisseurs
    """
    try:
        return affecter_nouveau_cos(
            nouveau_cos_name=req.nouveau_cos_name,
            nouveau_cos_email=req.nouveau_cos_email,
            nb_fournisseurs_a_transferer=req.nb_fournisseurs_a_transferer,
        )
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/agent/kaizen")
def agent_kaizen():
    """
    Route 47 : Boucle Kaizen — Compare estimation vs réalité.
    Retourne le facteur de correction et les écarts par COS.
    """
    try:
        return kaizen_recalibrage()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/agent/dashboard")
def agent_dashboard():
    """
    Route 48 : Dashboard agent — Vue d'ensemble de l'état de l'équipe.
    Mode actuel (estimation/historique), métriques, alertes.
    """
    try:
        return dashboard_agent()
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/agent/config")
def agent_config():
    """
    Route 49 : Configuration actuelle de l'agent (poids, seuils).
    """
    from utils.agent_affectation import (
        DEFAULT_WEIGHTS,
        CAPACITE_JOURNALIERE,
        CHARGE_ESTIMEE_PAR_FOURNISSEUR_BASE,
        TAKT_MIN_MINUTES,
        CHARGE_MAX_PCT,
        CHARGE_PAR_TRIP_MOYEN,
    )
    return {
        "weights": DEFAULT_WEIGHTS,
        "capacite_journaliere_min": CAPACITE_JOURNALIERE,
        "charge_estimee_par_fournisseur_min": CHARGE_ESTIMEE_PAR_FOURNISSEUR_BASE,
        "charge_par_trip_moyen_min": CHARGE_PAR_TRIP_MOYEN,
        "takt_min_minutes": TAKT_MIN_MINUTES,
        "charge_max_pct": CHARGE_MAX_PCT,
        "formule": "Score = w1×Capacité + w2×Takt + w3×Disponibilité - w4×ÉcartType",
        "concepts_lean": {
            "heijunka": "Lissage de charge (w1 + w3)",
            "takt_time": "Rythme cible par fournisseur (w2)",
            "kaizen": "Recalibrage continu estimation vs réalité",
            "lissage": "Minimiser l'écart-type entre COS (w4)",
        },
    }


# ══════════════════════════════════════════════════════
# DEBUG
# ══════════════════════════════════════════════════════

@app.get("/api/debug/cos-list")
def debug_cos_list():
    try:
        fichier_stla = os.path.join(DATA_DIR, "STLA.xlsx")
        df = pd.read_excel(fichier_stla, dtype=str).fillna("")
        cos_list = df["I FAST COS"].str.strip().unique().tolist()
        return {"cos": cos_list}
    except Exception as e:
        return {"erreur": str(e)}


@app.get("/api/debug/routes")
def debug_routes():
    """Liste toutes les routes disponibles."""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name,
            })
    return {"total": len(routes), "routes": routes}