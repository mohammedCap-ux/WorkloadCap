// ============================================================
//   AFFECTATIONS - pont localStorage <-> backend
// ============================================================
// Meme pattern que declarations.js :
// - syncAffectationsFromBackend : telecharge au login et remplit localStorage
// - pushAffectationToBackend    : pousse une nouvelle affectation au backend
// - deleteAffectationFromBackend: supprime une affectation au backend par _backend_id

import api from "./api";

const LOCAL_KEY = "workload_affectations";

// ============================================================
//   SYNC au login : backend -> localStorage
// ============================================================

export async function syncAffectationsFromBackend(currentUser) {
  if (!currentUser) return;

  try {
    // Charger suppliers et consultants pour construire les maps id -> nom
    const [suppliersResp, consultantsResp, affsResp] = await Promise.all([
      api.listSuppliers({ limit: 1000 }),
      api.listConsultants({ limit: 500 }),
      api.listAssignments({ limit: 1000 }),
    ]);

    // Normaliser : certaines routes retournent {items: [...]}, d'autres un array direct
    const toArray = (r) => Array.isArray(r) ? r : (r?.items || []);
    const suppliersRaw = toArray(suppliersResp);
    const consultantsRaw = toArray(consultantsResp);
    const affsBackend = toArray(affsResp);

    // Maps id -> nom
    const supplierNameById = {};
    suppliersRaw.forEach(s => { supplierNameById[s.id] = s.name; });
    const consultantNameById = {};
    consultantsRaw.forEach(c => { consultantNameById[c.id] = c.name; });

    // Maps nom -> id (stockees pour les pushs futurs)
    const supplierIdByName = {};
    suppliersRaw.forEach(s => { supplierIdByName[s.name] = s.id; });
    const consultantIdByName = {};
    consultantsRaw.forEach(c => { consultantIdByName[c.name] = c.id; });
    localStorage.setItem("workload_suppliers_map", JSON.stringify(supplierIdByName));
    localStorage.setItem("workload_consultants_map", JSON.stringify(consultantIdByName));

    // Convertir les affectations backend au format front
    const affsLocal = affsBackend.map(a => ({
      supplier: supplierNameById[a.supplier_id] || `#${a.supplier_id}`,
      cos: consultantNameById[a.consultant_id] || `#${a.consultant_id}`,
      date: a.assigned_at ? a.assigned_at.split("T")[0] : new Date().toISOString().split("T")[0],
      _backend_id: a.id,
      _ai: a.assigned_by === "ai",
    }));

    // Merger avec localStorage : on garde les locales sans _backend_id, on remplace les autres
    const existingLocal = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    const existingByBackendId = new Set(affsLocal.map(a => a._backend_id));
    const merged = [
      ...existingLocal.filter(a => !a._backend_id),
      ...affsLocal,
    ];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));

    console.log("[sync] ", affsLocal.length, "affectations chargees du backend");
  } catch (err) {
    console.warn("[sync] Echec sync affectations:", err.message);
  }
}

// ============================================================
//   PUSH : nouvelle affectation -> backend
// ============================================================

export async function pushAffectationToBackend(localAff) {
  const supplierMap = JSON.parse(localStorage.getItem("workload_suppliers_map") || "{}");
  const consultantMap = JSON.parse(localStorage.getItem("workload_consultants_map") || "{}");

  // Matching case-insensitive : on construit un index lowercase -> id
  const findId = (map, name) => {
    if (!name) return null;
    if (map[name]) return map[name]; // match exact rapide
    const lower = name.toLowerCase().trim();
    for (const key of Object.keys(map)) {
      if (key.toLowerCase().trim() === lower) return map[key];
    }
    return null;
  };

  const supplierId = findId(supplierMap, localAff.supplier);
  const consultantId = findId(consultantMap, localAff.cos);

  if (!supplierId || !consultantId) {
    console.warn("[push] Supplier ou consultant non resolu, affectation non envoyee:", localAff);
    return null;
  }

  try {
    const created = await api.createAssignment(consultantId, supplierId, "manual");
    console.log("[push] Affectation envoyee au backend, id =", created.id);
    return created;
  } catch (err) {
    console.warn("[push] Echec envoi affectation au backend:", err.message);
    return null;
  }
}

// ============================================================
//   DELETE : supprimer une affectation -> backend
// ============================================================

export async function deleteAffectationFromBackend(backendId) {
  if (!backendId) {
    console.warn("[delete] Pas de _backend_id, suppression non envoyee au backend");
    return false;
  }

  try {
    await api.deleteAssignment(backendId);
    console.log("[delete] Affectation supprimee du backend, id =", backendId);
    return true;
  } catch (err) {
    console.warn("[delete] Echec suppression affectation au backend:", err.message);
    return false;
  }
}
