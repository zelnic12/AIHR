// Toast notifications. toast(message, type) where type ∈ 'success'|'error'|'info'.
export function toast(message, type = "info", ms = 3200) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .2s ease";
    setTimeout(() => el.remove(), 220);
  }, ms);
}
