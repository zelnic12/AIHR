// Stat card + grid components.
import { esc } from "./format.js";

// card: { icon, label, value, sub }
export function statCard({ icon = "", label = "", value = "", sub = "" }) {
  return `
    <div class="stat-card">
      ${icon ? `<span class="stat-icon">${icon}</span>` : ""}
      <span class="stat-label">${esc(label)}</span>
      <span class="stat-value">${esc(value)}</span>
      ${sub ? `<span class="stat-sub">${esc(sub)}</span>` : ""}
    </div>`;
}

export function statGrid(cards) {
  return `<div class="stat-grid">${cards.map(statCard).join("")}</div>`;
}
