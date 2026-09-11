// Thin API client for the admin dashboard. Centralises fetch + error handling
// so views never touch fetch directly.

const BASE = "/api";
const TOKEN_KEY = "voltedge_admin_token";

// ---- Token storage ----
export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: t => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY),
};

// Called when a request returns 401 so the app can show the login screen.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

// Raised on 401 so callers can distinguish auth failures.
export class AuthError extends Error {}

async function request(path, { method = "GET", body, authRequired = true } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  const token = auth.getToken();
  if (token && authRequired) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    auth.clear();
    if (onUnauthorized) onUnauthorized();
    throw new AuthError("Your session has expired. Please sign in again.");
  }

  // 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.details) ? data.details.join(" ") : "";
    const message = [data.error, detail].filter(Boolean).join(": ") || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password }, authRequired: false }),
  me: () => request("/auth/me"),

  // Products
  listProducts: () => request("/products"),
  getProduct: id => request(`/products/${id}`),
  createProduct: data => request("/products", { method: "POST", body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: data }),
  deleteProduct: id => request(`/products/${id}`, { method: "DELETE" }),

  // Orders
  listOrders: () => request("/orders"),
  getOrder: id => request(`/orders/${id}`),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: { status } }),

  // Analytics
  overview: () => request("/analytics/overview"),
  summary: () => request("/analytics/summary"),
  bestSellers: (limit = 5) => request(`/analytics/best-sellers?limit=${limit}`),
  salesByCategory: () => request("/analytics/sales-by-category"),
  salesByBrand: () => request("/analytics/sales-by-brand"),
  timeseries: (bucket = "day", points = 30) => request(`/analytics/timeseries?bucket=${bucket}&points=${points}`),
  lowStock: (threshold = 5) => request(`/analytics/low-stock?threshold=${threshold}`),
};
