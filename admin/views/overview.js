// Overview view: KPI cards, sales chart, best-sellers, low-stock alerts.
import { api } from "../components/api.js";
import { money, num, esc } from "../components/format.js";
import { statGrid } from "../components/statCard.js";
import { lineChart, barChart } from "../components/charts.js";
import { dataTable } from "../components/dataTable.js";

export async function renderOverview(root) {
  root.innerHTML = `<p class="admin-status">Loading overview…</p>`;
  let data;
  try {
    data = await api.overview();
  } catch (err) {
    root.innerHTML = `<p class="admin-status error">${esc(err.message)}</p>`;
    return;
  }

  const { summary, bestSellers, byCategory, lowStock, timeseries } = data;

  const cards = statGrid([
    { icon: "💰", label: "Total revenue", value: money(summary.revenue), sub: `${num(summary.orders)} orders` },
    { icon: "🧾", label: "Orders", value: num(summary.orders), sub: `AOV ${money(summary.avgOrderValue)}` },
    { icon: "📦", label: "Units sold", value: num(summary.unitsSold), sub: `${num(summary.productCount)} products` },
    { icon: "👥", label: "Customers", value: num(summary.customers) },
  ]);

  const chart = `
    <div class="panel">
      <div class="panel-head"><h2>Sales — last 30 days</h2></div>
      ${lineChart(timeseries, { labelFmt: b => new Date(b).toLocaleDateString(undefined, { month: "short", day: "numeric" }) })}
    </div>`;

  const split = `
    <div class="panel-grid">
      <div class="panel">
        <div class="panel-head"><h2>Best sellers</h2></div>
        ${barChart(bestSellers.map(b => ({ label: b.name, value: b.units })), { formatValue: v => `${num(v)} sold` })}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Revenue by category</h2></div>
        ${barChart(byCategory.map(c => ({ label: c.label, value: c.revenue })))}
      </div>
    </div>`;

  const lowStockPanel = `
    <div class="panel">
      <div class="panel-head"><h2>Low stock alerts</h2></div>
      ${dataTable({
        columns: [
          { key: "name", label: "Product" },
          { key: "category", label: "Category" },
          { key: "stock", label: "Stock", num: true, render: r => {
              const cls = r.stock <= 0 ? "out" : "low";
              return `<span class="stock-badge ${cls}">${r.stock}</span>`;
          }},
        ],
        rows: lowStock,
        empty: "All products are well stocked. 🎉",
      })}
    </div>`;

  root.innerHTML = cards + chart + split + lowStockPanel;
}
