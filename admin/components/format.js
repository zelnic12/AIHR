// Shared formatting + safety helpers for the admin UI.

export const money = n =>
  "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = n => Number(n || 0).toLocaleString();

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Format an ISO date as e.g. "Sep 10, 2026" or with time.
export function fmtDate(iso, withTime = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const opts = withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

// Stock status → { label, className }
export function stockStatus(stock) {
  if (stock <= 0) return { label: "Out", className: "out" };
  if (stock <= 5) return { label: "Low", className: "low" };
  return { label: "OK", className: "ok" };
}
