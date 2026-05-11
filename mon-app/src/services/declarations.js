// ═══════════════════════════════════════════════════════════════
// Pont localStorage ↔ Backend pour les déclarations
// ═══════════════════════════════════════════════════════════════
// Le localStorage reste la source de vérité pour l'UI (clés en français),
// le backend reçoit les nouvelles déclarations en arrière-plan.
// ═══════════════════════════════════════════════════════════════

import api from "./api";

const STORAGE_KEY = "workload_declarations";

// ─── Helpers ───

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Conversion backend → format localStorage (clés françaises) ───

function backendToLocalFormat(backendDecl) {
  return {
    Consultant: backendDecl.consultant_name,
    Tache: backendDecl.task_name,
    Categorie: backendDecl.category_name,
    Date: backendDecl.date,
    "Duree Standard (min)": backendDecl.standard_duration_min,
    "Duree Reelle (min)": backendDecl.real_duration_min,
    "Duree Consacree (min)": backendDecl.real_duration_min,
    Statut: backendDecl.status,
    _backend_id: backendDecl.id, // utile si on veut update/delete plus tard
  };
}

// ─── Sync initiale au login ───

export async function syncDeclarationsFromBackend(currentUser) {
  if (!currentUser) return;

  try {
    // Managers : pour l'instant on ne sync rien (ils verraient les decl
    // d'un seul consultant à la fois, pas utile au login).
    // Consultants : on charge leurs propres déclarations.
    if (currentUser.role !== "consultant") return;

    const backendDecls = await api.listDeclarations({ limit: 1000 });
    const localFormat = backendDecls.map(backendToLocalFormat);

    // On fusionne avec ce qui existe déjà en local (évite de perdre
    // d'éventuelles déclarations en attente de sync)
    const existingLocal = readLocal();
    const existingByBackendId = new Set(
      existingLocal.map((d) => d._backend_id).filter(Boolean)
    );

    const merged = [
      ...existingLocal.filter((d) => !d._backend_id),
      ...localFormat.filter((d) => !existingByBackendId.has(d._backend_id)),
    ];

    writeLocal(merged);
    console.log(`[sync] ${localFormat.length} declarations chargees du backend`);
  } catch (err) {
    console.warn("[sync] Impossible de charger les declarations:", err.message);
  }
}

// ─── Envoi d'une nouvelle déclaration au backend ───

export async function pushDeclarationToBackend(localDecl, taskId) {
  if (!taskId) {
    console.warn("[push] Pas de task_id, declaration non envoyee au backend");
    return null;
  }

  try {
    const realMin =
      localDecl["Duree Consacree (min)"] ||
      localDecl["Duree Reelle (min)"] ||
      localDecl["Duree Standard (min)"] ||
      0;

    const created = await api.createDeclaration({
      taskId: taskId,
      date: localDecl.Date,
      realDurationMin: realMin,
      status: localDecl.Statut === "En cours" ? "ongoing" : "done",
    });

    console.log("[push] Declaration envoyee au backend, id =", created.id);
    return created;
  } catch (err) {
    console.warn("[push] Echec envoi declaration au backend:", err.message);
    return null;
  }
}

// ============================================================
//   UPDATE (PATCH) - modifier une declaration existante
// ============================================================

export async function updateDeclarationInBackend(backendId, { realDurationMin, status } = {}) {
  if (!backendId) {
    console.warn("[update] Pas de _backend_id, modification non envoyee au backend");
    return null;
  }

  // Garde : ne pas envoyer de PATCH avec une duree vide ou nulle (le backend rejette avec 422)
  if (realDurationMin === undefined || realDurationMin === null || realDurationMin === 0) {
    console.warn("[update] realDurationMin vide ou 0, PATCH non envoye (id =", backendId, ")");
    return null;
  }

  try {
    const updated = await api.updateDeclaration(backendId, { realDurationMin, status });
    console.log("[update] Declaration mise a jour au backend, id =", backendId);
    return updated;
  } catch (err) {
    console.warn("[update] Echec modification declaration au backend:", err.message);
    return null;
  }
}

// ============================================================
//   DELETE - supprimer une declaration
// ============================================================

export async function deleteDeclarationFromBackend(backendId) {
  if (!backendId) {
    console.warn("[delete] Pas de _backendId, suppression non envoyee au backend");
    return false;
  }

  try {
    await api.deleteDeclaration(backendId);
    console.log("[delete] Declaration supprimee du backend, id =", backendId);
    return true;
  } catch (err) {
    console.warn("[delete] Echec suppression declaration au backend:", err.message);
    return false;
  }
}
