// Reusable data table renderer.
// columns: [{ key, label, num?, render?(row) }]
// rows: array of objects. rowKey: optional fn(row) -> id used for data-id.
import { esc } from "./format.js";

export function dataTable({ columns, rows, rowKey, empty = "No data." }) {
  if (!rows || rows.length === 0) {
    return `<p class="admin-status">${esc(empty)}</p>`;
  }

  const head = columns.map(c =>
    `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`
  ).join("");

  const body = rows.map(row => {
    const id = rowKey ? esc(rowKey(row)) : "";
    const cells = columns.map(c => {
      const content = c.render ? c.render(row) : esc(row[c.key]);
      return `<td class="${c.num ? "num" : ""}">${content}</td>`;
    }).join("");
    return `<tr${id ? ` data-id="${id}"` : ""}>${cells}</tr>`;
  }).join("");

  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}
