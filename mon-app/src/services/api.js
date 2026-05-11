// ═══════════════════════════════════════════════════════════════
// API Client — pont entre le front React et le backend FastAPI
// ═══════════════════════════════════════════════════════════════
// Tous les appels au backend passent par ce fichier.
// Ne fais JAMAIS un fetch direct dans tes composants.
// ═══════════════════════════════════════════════════════════════

const API_BASE = "http://127.0.0.1:8000";
const TOKEN_KEY = "workload_jwt";

// ─── Gestion du token JWT ───

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ─── Helper interne pour tous les appels fetch ───

async function request(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (err) {
    throw new Error(`Impossible de contacter le backend (${API_BASE}). Est-il bien lancé ?`);
  }

  // 204 No Content → pas de body
  if (response.status === 204) return null;

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════
//   AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════

async function login(email, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  setToken(data.access_token);
  return data;
}

function logout() {
  setToken(null);
}

async function getMe() {
  return request("/api/auth/me");
}

function isAuthenticated() {
  return !!getToken();
}

// ═══════════════════════════════════════════════════════════════
//   USERS
// ═══════════════════════════════════════════════════════════════

async function listUsers({ role, search, skip = 0, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (role) params.append("role", role);
  if (search) params.append("search", search);
  params.append("skip", skip);
  params.append("limit", limit);
  return request(`/api/users?${params.toString()}`);
}

async function getUser(userId) {
  return request(`/api/users/${userId}`);
}

// ═══════════════════════════════════════════════════════════════
//   TEAMS
// ═══════════════════════════════════════════════════════════════

async function listTeams() {
  return request("/api/teams");
}

async function getTeam(teamId) {
  return request(`/api/teams/${teamId}`);
}

// ═══════════════════════════════════════════════════════════════
//   CONSULTANTS
// ═══════════════════════════════════════════════════════════════

async function listConsultants({ peopleManagerId, skip = 0, limit = 200 } = {}) {
  const params = new URLSearchParams();
  if (peopleManagerId) params.append("people_manager_id", peopleManagerId);
  params.append("skip", skip);
  params.append("limit", limit);
  return request(`/api/consultants?${params.toString()}`);
}

async function getConsultant(consultantId) {
  return request(`/api/consultants/${consultantId}`);
}

// ═══════════════════════════════════════════════════════════════
//   SUPPLIERS
// ═══════════════════════════════════════════════════════════════

async function listSuppliers({ search, onlyUnassigned, onlyAssigned, skip = 0, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (onlyUnassigned) params.append("only_unassigned", "true");
  if (onlyAssigned) params.append("only_assigned", "true");
  params.append("skip", skip);
  params.append("limit", limit);
  return request(`/api/suppliers?${params.toString()}`);
}

async function getSupplier(supplierId) {
  return request(`/api/suppliers/${supplierId}`);
}

async function createSupplier(name, country = null) {
  return request("/api/suppliers", {
    method: "POST",
    body: { name, country },
  });
}

// ═══════════════════════════════════════════════════════════════
//   ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════

async function listAssignments({ consultantId, supplierId, assignedBy, skip = 0, limit = 200 } = {}) {
  const params = new URLSearchParams();
  if (consultantId) params.append("consultant_id", consultantId);
  if (supplierId) params.append("supplier_id", supplierId);
  if (assignedBy) params.append("assigned_by", assignedBy);
  params.append("skip", skip);
  params.append("limit", limit);
  return request(`/api/assignments?${params.toString()}`);
}

async function createAssignment(consultantId, supplierId, assignedBy = "manual") {
  return request("/api/assignments", {
    method: "POST",
    body: {
      consultant_id: consultantId,
      supplier_id: supplierId,
      assigned_by: assignedBy,
    },
  });
}

async function createAssignmentsBulk(items) {
  return request("/api/assignments/bulk", {
    method: "POST",
    body: { items },
  });
}

async function deleteAssignment(assignmentId) {
  return request(`/api/assignments/${assignmentId}`, { method: "DELETE" });
}

// ═══════════════════════════════════════════════════════════════
//   CATEGORIES
// ═══════════════════════════════════════════════════════════════

async function listCategories() {
  return request("/api/categories");
}

// ═══════════════════════════════════════════════════════════════
//   DECLARATIONS
// ═══════════════════════════════════════════════════════════════

async function listDeclarations({ consultantId, dateFrom, dateTo, skip = 0, limit = 200 } = {}) {
  const params = new URLSearchParams();
  if (consultantId) params.append("consultant_id", consultantId);
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  params.append("skip", skip);
  params.append("limit", limit);
  return request(`/api/declarations?${params.toString()}`);
}

async function getDeclarationStats({ consultantId, dateFrom, dateTo } = {}) {
  const params = new URLSearchParams();
  if (consultantId) params.append("consultant_id", consultantId);
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  return request(`/api/declarations/stats?${params.toString()}`);
}

async function createDeclaration({ taskId, date, realDurationMin, status = "done" }) {
  return request("/api/declarations", {
    method: "POST",
    body: {
      task_id: taskId,
      date,
      real_duration_min: realDurationMin,
      status,
    },
  });
}

async function updateDeclaration(declarationId, { realDurationMin, status } = {}) {
  const body = {};
  if (realDurationMin !== undefined) body.real_duration_min = realDurationMin;
  if (status !== undefined) body.status = status;
  return request(`/api/declarations/${declarationId}`, {
    method: "PATCH",
    body,
  });
}

async function deleteDeclaration(declarationId) {
  return request(`/api/declarations/${declarationId}`, { method: "DELETE" });
}

// ============================================================
//   AGENT IA
// ============================================================

async function proposeAssignments(supplierNames) {
  return request("/api/agent/propose-assignments", {
    method: "POST",
    body: { supplier_names: supplierNames },
  });
}

async function confirmAssignments(proposals) {
  return request("/api/agent/confirm-assignments", {
    method: "POST",
    body: { proposals },
  });
}

async function getGeoData() {
  return request("/api/geo/data");
}

async function recommendDocks(payload) {
  return request("/api/agent/recommend-docks", {
    method: "POST",
    body: payload,
  });
}

async function uploadStockFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const response = await fetch(API_BASE + "/api/geo/upload-stock", {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.detail || "Upload echoue");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getStockSummary() {
  return request("/api/geo/stock-summary");
}

// ═══════════════════════════════════════════════════════════════
//   EXPORT
// ═══════════════════════════════════════════════════════════════

const api = {
  // auth
  login, logout, getMe, isAuthenticated, getToken,
  // users
  listUsers, getUser,
  // teams
  listTeams, getTeam,
  // consultants
  listConsultants, getConsultant,
  // suppliers
  listSuppliers, getSupplier, createSupplier,
  // assignments
  listAssignments, createAssignment, createAssignmentsBulk, deleteAssignment,
  // categories
  listCategories,
  // declarations
  listDeclarations, getDeclarationStats, createDeclaration, updateDeclaration, deleteDeclaration,
  // agent IA
  proposeAssignments, confirmAssignments,
  // geolocalisation
  getGeoData,
  recommendDocks, uploadStockFile, getStockSummary,
};

export default api;
