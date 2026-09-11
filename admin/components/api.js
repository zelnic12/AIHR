// Thin API client for the admin dashboard. Centralises fetch + error handling
// so views never touch fetch directly.

const BASE = "/api";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

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
