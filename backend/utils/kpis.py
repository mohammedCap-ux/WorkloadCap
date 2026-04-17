"""
kpis.py — Calcul des indicateurs industriels
"""
import os
import pandas as pd
from datetime import date, timedelta
from utils.database import get_all_declarations

# ── Chemin vers le fichier Excel (durées standard) ──
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def load_standard_times():
    """Charge les durées standard depuis Excel (en minutes)."""
    fichier = os.path.join(DATA_DIR, "Workload_vFinal_1.xlsx")
    df = pd.read_excel(fichier)
    df["Tâche"] = df["Tâche"].ffill()
    df["Durée standard (min)"] = (df["Durée (H)"] * 60).round(0).fillna(0).astype(int)
    
    # Dictionnaire : nom de la micro-tâche → durée standard
    return dict(zip(df["Micro tâche"], df["Durée standard (min)"]))


def temps_cycle_reel_vs_standard():
    """
    Compare la durée réelle (déclarée) vs la durée standard (Excel)
    pour chaque tâche. Détecte les dépassements.
    """
    standards = load_standard_times()
    declarations = get_all_declarations()
    
    # Collecter toutes les tâches déclarées
    taches_stats = {}
    for decl in declarations:
        for tache in decl["taches"]:
            nom = tache["nom"]
            duree_reelle = tache["duree_totale"]
            standard = standards.get(nom, 0)
            
            if nom not in taches_stats:
                taches_stats[nom] = {
                    "nom": nom,
                    "standard_min": standard,
                    "declarations": [],
                }
            taches_stats[nom]["declarations"].append({
                "duree_reelle": duree_reelle,
                "date": decl["date"],
                "user": decl["user_name"],
            })
    
    # Calculer les moyennes et dépassements
    resultat = []
    for nom, stats in taches_stats.items():
        durees = [d["duree_reelle"] for d in stats["declarations"]]
        moyenne = sum(durees) / len(durees) if durees else 0
        standard = stats["standard_min"]
        ecart = moyenne - standard
        depassements = sum(1 for d in durees if d > standard)
        
        resultat.append({
            "nom": nom,
            "standard_min": standard,
            "moyenne_reelle_min": round(moyenne),
            "ecart_min": round(ecart),
            "ecart_pct": round((ecart / standard) * 100) if standard > 0 else 0,
            "nb_declarations": len(durees),
            "nb_depassements": depassements,
            "taux_depassement_pct": round((depassements / len(durees)) * 100) if durees else 0,
        })
    
    return sorted(resultat, key=lambda x: x["ecart_min"], reverse=True)


def taux_utilisation():
    """
    Calcule le taux d'utilisation par consultant.
    Taux = temps productif / 480 min (8h) × 100
    """
    declarations = get_all_declarations()
    
    # Grouper par consultant
    par_user = {}
    for decl in declarations:
        email = decl["user_email"]
        if email not in par_user:
            par_user[email] = {
                "user_name": decl["user_name"],
                "user_email": email,
                "journees": [],
            }
        par_user[email]["journees"].append({
            "date": decl["date"],
            "total_min": decl["total_min"],
        })
    
    resultat = []
    for email, data in par_user.items():
        totaux = [j["total_min"] for j in data["journees"]]
        moyenne = sum(totaux) / len(totaux) if totaux else 0
        
        resultat.append({
            "user_name": data["user_name"],
            "user_email": email,
            "nb_jours": len(totaux),
            "moyenne_min_jour": round(moyenne),
            "taux_utilisation_pct": round((moyenne / 480) * 100),
            "statut": "Sous-charge" if moyenne < 480 else "Normal" if moyenne == 480 else "Surcharge",
        })
    
    return sorted(resultat, key=lambda x: x["taux_utilisation_pct"], reverse=True)


def goulots_etranglement():
    """
    Détecte les tâches qui bloquent le plus :
    - Les plus chronophages (Pareto)
    - Celles qui dépassent le plus souvent le standard
    """
    stats = temps_cycle_reel_vs_standard()
    
    # Trier par écart (les plus en retard en premier)
    goulots = [t for t in stats if t["ecart_min"] > 0]
    goulots = sorted(goulots, key=lambda x: x["ecart_min"], reverse=True)
    
    return goulots


def pareto_taches():
    """
    Analyse Pareto : quelles tâches consomment le plus de temps.
    Retourne les tâches triées par temps total cumulé.
    """
    declarations = get_all_declarations()
    
    temps_par_tache = {}
    for decl in declarations:
        for tache in decl["taches"]:
            nom = tache["nom"]
            if nom not in temps_par_tache:
                temps_par_tache[nom] = 0
            temps_par_tache[nom] += tache["duree_totale"]
    
    # Trier par temps total décroissant
    taches_triees = sorted(temps_par_tache.items(), key=lambda x: x[1], reverse=True)
    
    # Calculer le pourcentage cumulé
    total_global = sum(t[1] for t in taches_triees)
    cumul = 0
    resultat = []
    for nom, total in taches_triees:
        cumul += total
        resultat.append({
            "nom": nom,
            "total_min": total,
            "pct": round((total / total_global) * 100) if total_global > 0 else 0,
            "cumul_pct": round((cumul / total_global) * 100) if total_global > 0 else 0,
        })
    
    return resultat


def tendance_hebdo(user_email=None):
    """
    Tendance d'amélioration continue : charge par semaine.
    Si user_email est fourni, filtre pour ce consultant.
    """
    declarations = get_all_declarations()
    
    if user_email:
        declarations = [d for d in declarations if d["user_email"] == user_email]
    
    # Grouper par semaine
    par_semaine = {}
    for decl in declarations:
        d = date.fromisoformat(decl["date"])
        # Numéro de semaine
        semaine_key = f"{d.isocalendar()[0]}-S{d.isocalendar()[1]:02d}"
        
        if semaine_key not in par_semaine:
            par_semaine[semaine_key] = {
                "semaine": semaine_key,
                "total_min": 0,
                "nb_jours": 0,
            }
        par_semaine[semaine_key]["total_min"] += decl["total_min"]
        par_semaine[semaine_key]["nb_jours"] += 1
    
    # Calculer la moyenne par jour pour chaque semaine
    resultat = []
    for semaine, data in sorted(par_semaine.items()):
        moyenne = data["total_min"] / data["nb_jours"] if data["nb_jours"] > 0 else 0
        resultat.append({
            "semaine": data["semaine"],
            "total_min": data["total_min"],
            "nb_jours": data["nb_jours"],
            "moyenne_jour_min": round(moyenne),
        })
    
    return resultat
def rendement_consultant():
    """
    Calcule le rendement de chaque consultant.
    Rendement = (temps standard total / temps réel total) × 100
    - > 100% = consultant plus rapide que le standard
    - = 100% = pile dans le standard
    - < 100% = consultant plus lent que le standard
    """
    standards = load_standard_times()
    declarations = get_all_declarations()

    par_user = {}
    for decl in declarations:
        email = decl["user_email"]
        if email not in par_user:
            par_user[email] = {
                "user_name": decl["user_name"],
                "user_email": email,
                "temps_standard_total": 0,
                "temps_reel_total": 0,
                "nb_jours": 0,
                "semaines": {},
            }

        # Calculer par déclaration
        temps_std_jour = 0
        temps_reel_jour = 0
        for tache in decl["taches"]:
            std = standards.get(tache["nom"], 0) * tache.get("frequence", 1)
            temps_std_jour += std
            temps_reel_jour += tache["duree_totale"]

        par_user[email]["temps_standard_total"] += temps_std_jour
        par_user[email]["temps_reel_total"] += temps_reel_jour
        par_user[email]["nb_jours"] += 1

        # Grouper par semaine
        d = date.fromisoformat(decl["date"])
        semaine_key = f"{d.isocalendar()[0]}-S{d.isocalendar()[1]:02d}"
        if semaine_key not in par_user[email]["semaines"]:
            par_user[email]["semaines"][semaine_key] = {
                "temps_standard": 0,
                "temps_reel": 0,
            }
        par_user[email]["semaines"][semaine_key]["temps_standard"] += temps_std_jour
        par_user[email]["semaines"][semaine_key]["temps_reel"] += temps_reel_jour

    resultat = []
    for email, data in par_user.items():
        # Rendement global
        rendement_global = round(
            (data["temps_standard_total"] / data["temps_reel_total"]) * 100
        ) if data["temps_reel_total"] > 0 else 0

        # Rendement par semaine
        rendement_semaines = []
        for sem, vals in sorted(data["semaines"].items()):
            rend = round(
                (vals["temps_standard"] / vals["temps_reel"]) * 100
            ) if vals["temps_reel"] > 0 else 0
            rendement_semaines.append({
                "semaine": sem,
                "rendement_pct": rend,
            })

        resultat.append({
            "user_name": data["user_name"],
            "user_email": email,
            "nb_jours": data["nb_jours"],
            "rendement_global_pct": rendement_global,
            "rendement_semaines": rendement_semaines,
        })

    return sorted(resultat, key=lambda x: x["rendement_global_pct"], reverse=True)


def trs_oee():
    """
    Taux de Rendement Synthétique (TRS) adapté au service.
    TRS = Disponibilité × Performance × Qualité

    - Disponibilité = jours travaillés / jours ouvrés (le consultant a-t-il déclaré ?)
    - Performance = temps standard / temps réel (vitesse d'exécution)
    - Qualité = tâches sans dépassement / total tâches (respect des standards)
    """
    standards = load_standard_times()
    declarations = get_all_declarations()

    par_user = {}
    for decl in declarations:
        email = decl["user_email"]
        if email not in par_user:
            par_user[email] = {
                "user_name": decl["user_name"],
                "jours_declares": set(),
                "temps_standard_total": 0,
                "temps_reel_total": 0,
                "taches_total": 0,
                "taches_conformes": 0,
            }

        par_user[email]["jours_declares"].add(decl["date"])

        for tache in decl["taches"]:
            std = standards.get(tache["nom"], 0) * tache.get("frequence", 1)
            reel = tache["duree_totale"]
            par_user[email]["temps_standard_total"] += std
            par_user[email]["temps_reel_total"] += reel
            par_user[email]["taches_total"] += 1
            if reel <= std * 1.1:  # tolérance de 10%
                par_user[email]["taches_conformes"] += 1

    # Calculer les jours ouvrés (lundi-vendredi) sur la période
    if declarations:
        toutes_dates = [date.fromisoformat(d["date"]) for d in declarations]
        date_min = min(toutes_dates)
        date_max = max(toutes_dates)
        jours_ouvres = sum(
            1 for i in range((date_max - date_min).days + 1)
            if (date_min + timedelta(days=i)).weekday() < 5
        )
    else:
        jours_ouvres = 1

    resultat = []
    for email, data in par_user.items():
        disponibilite = len(data["jours_declares"]) / jours_ouvres if jours_ouvres > 0 else 0
        performance = (data["temps_standard_total"] / data["temps_reel_total"]) if data["temps_reel_total"] > 0 else 0
        qualite = (data["taches_conformes"] / data["taches_total"]) if data["taches_total"] > 0 else 0

        trs = disponibilite * performance * qualite

        resultat.append({
            "user_name": data["user_name"],
            "user_email": email,
            "disponibilite_pct": round(disponibilite * 100),
            "performance_pct": round(performance * 100),
            "qualite_pct": round(qualite * 100),
            "trs_pct": round(trs * 100),
        })

    return sorted(resultat, key=lambda x: x["trs_pct"], reverse=True)


def lissage_charge():
    """
    Lissage de charge : identifie les déséquilibres entre consultants.
    Recommande à qui affecter un nouveau fournisseur.
    """
    declarations = get_all_declarations()

    par_user = {}
    for decl in declarations:
        email = decl["user_email"]
        if email not in par_user:
            par_user[email] = {
                "user_name": decl["user_name"],
                "user_email": email,
                "journees": [],
            }
        par_user[email]["journees"].append(decl["total_min"])

    resultat = []
    for email, data in par_user.items():
        totaux = data["journees"]
        moyenne = sum(totaux) / len(totaux) if totaux else 0
        capacite_restante = max(0, 480 - moyenne)

        resultat.append({
            "user_name": data["user_name"],
            "user_email": email,
            "charge_moyenne_min": round(moyenne),
            "capacite_restante_min": round(capacite_restante),
            "nb_jours": len(totaux),
            "recommandation": "Disponible pour nouveaux fournisseurs" if capacite_restante > 60 else "Charge pleine",
        })

    resultat = sorted(resultat, key=lambda x: x["capacite_restante_min"], reverse=True)

    return {
        "consultants": resultat,
        "suggestion_affectation": resultat[0]["user_name"] if resultat else "Aucun consultant disponible",
    }


def ordonnancement_lpt():
    """
    Ordonnancement LPT (Longest Processing Time first).
    Trie les tâches de la plus longue à la plus courte.
    En industrie, commencer par les tâches longues réduit le makespan.
    """
    standards = load_standard_times()

    taches_triees = sorted(standards.items(), key=lambda x: x[1], reverse=True)

    return [
        {"ordre": i + 1, "nom": nom, "duree_min": duree}
        for i, (nom, duree) in enumerate(taches_triees)
    ]


def ordonnancement_ia():
    """
    Suggestion d'ordonnancement basée sur l'historique.
    Analyse les jours les plus productifs (rendement élevé)
    et extrait l'ordre des tâches de ces journées.
    """
    standards = load_standard_times()
    declarations = get_all_declarations()

    if not declarations:
        return {"message": "Pas assez de données pour l'IA", "suggestion": []}

    # Calculer le rendement de chaque journée
    journees_avec_rendement = []
    for decl in declarations:
        temps_std = 0
        temps_reel = 0
        for tache in decl["taches"]:
            std = standards.get(tache["nom"], 0) * tache.get("frequence", 1)
            temps_std += std
            temps_reel += tache["duree_totale"]

        rendement = (temps_std / temps_reel * 100) if temps_reel > 0 else 0
        journees_avec_rendement.append({
            "date": decl["date"],
            "user": decl["user_name"],
            "rendement": round(rendement),
            "taches_ordre": [t["nom"] for t in decl["taches"]],
        })

    # Trier par rendement décroissant
    journees_avec_rendement.sort(key=lambda x: x["rendement"], reverse=True)

    # Prendre les 5 meilleures journées
    meilleures = journees_avec_rendement[:5]

    # Compter la fréquence d'apparition en première position
    premiere_tache = {}
    for j in meilleures:
        if j["taches_ordre"]:
            nom = j["taches_ordre"][0]
            premiere_tache[nom] = premiere_tache.get(nom, 0) + 1

    return {
        "message": "Basé sur les 5 journées les plus productives",
        "meilleures_journees": meilleures,
        "tache_recommandee_en_premier": max(premiere_tache, key=premiere_tache.get) if premiere_tache else "Pas assez de données",
    }


def setup_time():
    """
    Temps de changement entre catégories (setup time).
    Quand un consultant passe d'une catégorie à une autre
    (ex: Booking → Invoicing), il y a un temps de transition.
    Analyse les données pour estimer ce temps perdu.
    """
    declarations = get_all_declarations()
    standards = load_standard_times()

    # Charger les catégories depuis Excel
    fichier = os.path.join(DATA_DIR, "Workload_vFinal_1.xlsx")
    df = pd.read_excel(fichier)
    df["Tâche"] = df["Tâche"].ffill()
    tache_to_cat = dict(zip(df["Micro tâche"], df["Tâche"]))

    # Compter les changements de catégorie par journée
    changements_par_jour = []
    for decl in declarations:
        categories_ordre = []
        for tache in decl["taches"]:
            cat = tache_to_cat.get(tache["nom"], "Autre")
            categories_ordre.append(cat)

        nb_changements = 0
        for i in range(1, len(categories_ordre)):
            if categories_ordre[i] != categories_ordre[i - 1]:
                nb_changements += 1

        changements_par_jour.append({
            "date": decl["date"],
            "user": decl["user_name"],
            "nb_taches": len(decl["taches"]),
            "nb_changements_categorie": nb_changements,
            "categories_ordre": categories_ordre,
        })

    # Moyenne de changements
    total_changements = sum(c["nb_changements_categorie"] for c in changements_par_jour)
    nb_jours = len(changements_par_jour)
    moyenne = round(total_changements / nb_jours, 1) if nb_jours > 0 else 0

    return {
        "moyenne_changements_par_jour": moyenne,
        "total_jours_analyses": nb_jours,
        "detail": changements_par_jour,
        "conseil": "Regrouper les tâches par catégorie pour réduire les changements" if moyenne > 3 else "Bon regroupement des tâches",
    }