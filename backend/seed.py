"""
Script de seed : lit code.txt (React) et remplit la BDD SQLite.

Usage : python seed.py
Relance possible : le script est idempotent (DROP + recreate tout à chaque fois).
"""
import re
import json
import sys
from pathlib import Path

from database import engine, SessionLocal, Base
import models
from models import (
    User, Team, PeopleManager, Consultant,
    Supplier, Assignment, Category, Task
)
from services.auth_service import hash_password


CODE_FILE = Path(__file__).parent / "code.txt"


# ═══════════════════════════════════════════════════════════════
# ÉTAPE A — Extraction des structures JS depuis code.txt
# ═══════════════════════════════════════════════════════════════

def extract_js_block(source: str, var_name: str) -> str:
    """
    Extrait le contenu d'une déclaration JS `const VAR = {...}` ou `const VAR = [...]`.
    Retourne la chaîne brute entre les accolades/crochets (incluse).
    Gère l'imbrication en comptant les délimiteurs.
    """
    pattern = rf"const\s+{var_name}\s*="
    m = re.search(pattern, source)
    if not m:
        raise ValueError(f"Variable {var_name} introuvable dans code.txt")

    start = m.end()
    # Skip whitespace jusqu'au délimiteur ouvrant
    while start < len(source) and source[start] in " \t\r\n":
        start += 1

    open_char = source[start]
    if open_char not in "[{":
        raise ValueError(f"Délimiteur inattendu pour {var_name}: {open_char}")
    close_char = "]" if open_char == "[" else "}"

    depth = 0
    i = start
    in_string = False
    string_char = None

    while i < len(source):
        c = source[i]
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == string_char:
                in_string = False
        else:
            if c in "\"'":
                in_string = True
                string_char = c
            elif c == open_char:
                depth += 1
            elif c == close_char:
                depth -= 1
                if depth == 0:
                    return source[start:i+1]
        i += 1

    raise ValueError(f"Délimiteur fermant manquant pour {var_name}")


def js_to_json(js_str: str) -> str:
    """
    Convertit du JS "objet littéral" en JSON strict.
    Gère : clés sans quotes, commentaires, trailing commas, strings à single quotes,
    références à des variables JS (remplacées par null).
    """
    # Supprimer les commentaires /* ... */
    s = re.sub(r"/\*.*?\*/", "", js_str, flags=re.DOTALL)
    # Supprimer les commentaires // jusqu'à fin de ligne
    s = re.sub(r"//[^\n]*", "", s)

    # Remplacer les single quotes par des double quotes
    s = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", r'"\1"', s)

    # Ajouter des quotes autour des clés non quotées : {n: ...} → {"n": ...}
    s = re.sub(r"([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'\1"\2":', s)

    # Remplacer les références à des variables JS utilisées comme valeurs
    # (ex: { "cos": ALL_COS } → { "cos": null })
    # On garde les littéraux JSON valides : true, false, null
    def replace_js_ref(match):
        ident = match.group(1)
        suffix = match.group(2)
        if ident in ("true", "false", "null"):
            return match.group(0)
        return f": null{suffix}"

    s = re.sub(
        r":\s*([a-zA-Z_][a-zA-Z0-9_]*)(\s*[,}\]])",
        replace_js_ref,
        s
    )

    # Supprimer les trailing commas : ,} ou ,]
    s = re.sub(r",(\s*[}\]])", r"\1", s)

    return s


def load_js_var(source: str, var_name: str):
    raw = extract_js_block(source, var_name)
    json_str = js_to_json(raw)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"\n❌ Erreur de parsing pour {var_name} :")
        print(f"   {e}")
        print(f"   Extrait problématique : {json_str[max(0,e.pos-80):e.pos+80]}")
        sys.exit(1)


# ═══════════════════════════════════════════════════════════════
# ÉTAPE B — Helpers métier (cohérents avec ton code React)
# ═══════════════════════════════════════════════════════════════

def build_email(full_name: str) -> str:
    parts = full_name.strip().split()
    prenom = parts[0].lower()
    nom = parts[-1].lower() if len(parts) > 1 else prenom
    return f"{prenom}.{nom}@capgemini.com"


def build_password(full_name: str) -> str:
    parts = full_name.strip().split()
    prenom = parts[0].lower()
    nom = parts[-1].lower() if len(parts) > 1 else prenom
    return f"{prenom[0]}{nom}2026"


# ═══════════════════════════════════════════════════════════════
# ÉTAPE C — Reset complet de la BDD
# ═══════════════════════════════════════════════════════════════

def reset_database():
    print("🗑️  Suppression des tables existantes...")
    Base.metadata.drop_all(bind=engine)
    print("🏗️  Recréation des tables...")
    Base.metadata.create_all(bind=engine)


# ═══════════════════════════════════════════════════════════════
# ÉTAPE D — Seed principal
# ═══════════════════════════════════════════════════════════════

def seed():
    print(f"📖 Lecture de {CODE_FILE}...")
    if not CODE_FILE.exists():
        print(f"❌ code.txt introuvable à {CODE_FILE}")
        print("   Copie ton code.txt dans backend/ (voir étape 3.3)")
        sys.exit(1)

    source = CODE_FILE.read_text(encoding="utf-8")

    print("🔎 Extraction des structures JS...")
    all_cos = load_js_var(source, "ALL_COS")
    managers_data = load_js_var(source, "MANAGERS_DATA")
    people_managers_data = load_js_var(source, "PEOPLE_MANAGERS_DATA")
    team_structure = load_js_var(source, "TEAM_STRUCTURE")
    categories_data = load_js_var(source, "CATEGORIES")

    print(f"   ✓ {len(all_cos)} consultants trouvés")
    print(f"   ✓ {len(managers_data)} managers trouvés")
    print(f"   ✓ {len(people_managers_data)} people managers trouvés")
    print(f"   ✓ {len(categories_data)} catégories trouvées")

    reset_database()

    db = SessionLocal()
    try:
        # ── 1. Teams (managers)
        print("\n📦 Insertion des teams...")
        team_objs = {}
        for manager_name in managers_data.keys():
            t = Team(manager_name=manager_name)
            db.add(t)
            team_objs[manager_name] = t
        db.flush()  # récupère les IDs sans commit

        # ── 2. Users managers
        print("📦 Insertion des managers...")
        created_emails = set()
        for manager_name in managers_data.keys():
            email = build_email(manager_name)
            if email in created_emails:
                continue
            u = User(
                name=manager_name,
                email=email,
                hashed_password=hash_password(build_password(manager_name)),
                role="manager"
            )
            db.add(u)
            created_emails.add(email)
        db.flush()

        # ── 3. People managers (+ users associés)
        print("📦 Insertion des people managers...")
        pm_objs = {}  # name -> PeopleManager
        for pm_email, pm_info in people_managers_data.items():
            pm_name = pm_info["name"]
            pm_manager = pm_info["manager"]

            team = team_objs.get(pm_manager)
            if not team:
                print(f"   ⚠️  People manager {pm_name} a un manager inconnu: {pm_manager}")
                continue

            pm = PeopleManager(name=pm_name, email=pm_email, team_id=team.id)
            db.add(pm)
            pm_objs[pm_name] = pm

            if pm_email not in created_emails:
                u = User(
                    name=pm_name,
                    email=pm_email,
                    hashed_password=hash_password(build_password(pm_name)),
                    role="people_manager"
                )
                db.add(u)
                created_emails.add(pm_email)
        db.flush()

        # ── 4. Construire l'index COS → PeopleManager depuis TEAM_STRUCTURE
        cos_to_pm = {}  # cos_name -> pm_name
        for manager_name, pm_dict in team_structure.items():
            for pm_name, cos_list in pm_dict.items():
                for cos_name in cos_list:
                    cos_to_pm[cos_name] = pm_name

        # ── 5. Consultants (+ users associés)
        print("📦 Insertion des consultants...")
        consultant_objs = {}  # cos_name -> Consultant
        for cos in all_cos:
            cos_name = cos["n"]
            email = build_email(cos_name)

            # Skip si déjà créé comme manager ou PM
            if email in created_emails:
                # c'est un cas où un PM est aussi COS → on ne duplique pas le User,
                # mais on peut quand même créer le Consultant rattaché au même user
                existing_user = db.query(User).filter(User.email == email).first()
                user_to_link = existing_user
            else:
                u = User(
                    name=cos_name,
                    email=email,
                    hashed_password=hash_password(build_password(cos_name)),
                    role="consultant"
                )
                db.add(u)
                db.flush()
                created_emails.add(email)
                user_to_link = u

            pm_name = cos_to_pm.get(cos_name)
            pm_obj = pm_objs.get(pm_name) if pm_name else None

            c = Consultant(
                user_id=user_to_link.id,
                people_manager_id=pm_obj.id if pm_obj else None,
                trips=cos.get("t", 0)
            )
            db.add(c)
            consultant_objs[cos_name] = c
        db.flush()

        # ── 6. Suppliers (uniques, extraits de tous les COS)
        print("📦 Insertion des suppliers...")
        all_supplier_names = set()
        for cos in all_cos:
            for sup in cos.get("sup", []):
                all_supplier_names.add(sup.strip())

        supplier_objs = {}
        for sup_name in sorted(all_supplier_names):
            s = Supplier(name=sup_name)
            db.add(s)
            supplier_objs[sup_name] = s
        db.flush()

        # ── 7. Assignments (liens consultant ↔ supplier)
        print("📦 Insertion des assignments...")
        assignment_count = 0
        for cos in all_cos:
            cos_obj = consultant_objs.get(cos["n"])
            if not cos_obj:
                continue
            for sup_name in cos.get("sup", []):
                sup_obj = supplier_objs.get(sup_name.strip())
                if not sup_obj:
                    continue
                a = Assignment(
                    consultant_id=cos_obj.id,
                    supplier_id=sup_obj.id,
                    assigned_by="manual"  # données historiques → considérées comme manuelles
                )
                db.add(a)
                assignment_count += 1

        # ── 8. Categories + Tasks
        print("📦 Insertion des catégories et tâches...")
        task_count = 0
        for cat in categories_data:
            c = Category(name=cat["cat"], icon=cat.get("icon"))
            db.add(c)
            db.flush()
            for t in cat.get("tasks", []):
                task = Task(
                    name=t["name"],
                    standard_duration_min=t["dur"],
                    category_id=c.id
                )
                db.add(task)
                task_count += 1

        db.commit()

        print("\n✅ Seed terminé avec succès !")
        print(f"   • Users        : {db.query(User).count()}")
        print(f"   • Teams        : {db.query(Team).count()}")
        print(f"   • PeopleMgrs   : {db.query(PeopleManager).count()}")
        print(f"   • Consultants  : {db.query(Consultant).count()}")
        print(f"   • Suppliers    : {db.query(Supplier).count()}")
        print(f"   • Assignments  : {db.query(Assignment).count()}")
        print(f"   • Categories   : {db.query(Category).count()}")
        print(f"   • Tasks        : {db.query(Task).count()}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur pendant le seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()