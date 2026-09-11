// Orders view: list all orders, view details, update fulfilment status.
import { api } from "../components/api.js";
import { money, fmtDate, esc } from "../components/format.js";
import { dataTable } from "../components/dataTable.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";

const STATUSES = ["pending", "paid", "shipped", "cancelled"];

function statusBadge(status) {
  return `<span class="badge ${esc(status)}">${esc(status)}</span>`;
}

function orderDetail(root, order) {
  const items = order.items.map(it => `
    <tr>
      <td>${esc(it.name)}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${money(it.price)}</td>
      <td class="num">${money(it.price * it.qty)}</td>
    </tr>`).join("");

  const c = order.customer;
  openModal({
    title: `Order ${order.id}`,
    bodyHTML: `
      <p style="color:var(--muted);margin-bottom:1rem">${fmtDate(order.createdAt, true)} · ${statusBadge(order.status)}</p>
      <div class="panel" style="margin-bottom:1rem">
        <strong>${esc(c.name)}</strong><br>
        <span style="color:var(--muted);font-size:.88rem">
          ${esc(c.email)} · ${esc(c.phone)}<br>
          ${esc(c.address)}, ${esc(c.city)} ${esc(c.postal)}, ${esc(c.country)}
        </span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
      </div>
      <div style="margin-top:1rem;text-align:right">
        <div style="color:var(--muted);font-size:.9rem">Subtotal ${money(order.amounts.subtotal)} · Shipping ${money(order.amounts.shipping)} · Tax ${money(order.amounts.tax)}</div>
        <div style="font-size:1.3rem;font-weight:800;margin-top:.3rem">Total ${money(order.amounts.total)}</div>
      </div>
      <div class="form-field" style="margin-top:1.2rem">
        <label>Update status</label>
        <select id="statusSel">
          ${STATUSES.map(s => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>`,
    footHTML: `
      <button class="btn btn-ghost" data-close>Close</button>
      <button class="btn btn-primary" id="saveStatus">Save status</button>`,
    onMount(overlay, close) {
      overlay.querySelector("#saveStatus").addEventListener("click", async () => {
        const status = overlay.querySelector("#statusSel").value;
        try {
          await api.updateOrderStatus(order.id, status);
          toast("Order status updated", "success");
          close();
          renderOrders(root);
        } catch (e) { toast(e.message, "error"); }
      });
    },
  });
}

export async function renderOrders(root) {
  root.innerHTML = `<p class="admin-status">Loading orders…</p>`;
  let orders;
  try {
    orders = await api.listOrders();
  } catch (err) {
    root.innerHTML = `<p class="admin-status error">${esc(err.message)}</p>`;
    return;
  }

  const table = dataTable({
    columns: [
      { key: "id", label: "Order", render: r => `<span style="font-family:monospace;font-size:.82rem">${esc(r.id)}</span>` },
      { key: "customer", label: "Customer", render: r => esc(r.customer?.name || "—") },
      { key: "date", label: "Date", render: r => fmtDate(r.createdAt) },
      { key: "items", label: "Items", num: true, render: r => r.items.reduce((s, i) => s + i.qty, 0) },
      { key: "total", label: "Total", num: true, render: r => money(r.amounts.total) },
      { key: "status", label: "Status", render: r => statusBadge(r.status) },
      { key: "actions", label: "", render: r => `<div class="row-actions"><button class="icon-action" data-id="${esc(r.id)}">View</button></div>` },
    ],
    rows: orders,
    empty: "No orders yet.",
  });

  root.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Orders (${orders.length})</h2></div>
      ${table}
    </div>`;

  const byId = new Map(orders.map(o => [o.id, o]));
  root.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", () => orderDetail(root, byId.get(btn.dataset.id)));
  });
}
