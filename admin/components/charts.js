// Lightweight, dependency-free charts (HTML bars + inline SVG line chart).
import { esc, money } from "./format.js";

// Horizontal bar chart.
// data: [{ label, value }], formatValue: fn(value) -> string
export function barChart(data, { formatValue = money } = {}) {
  if (!data || data.length === 0) return `<p class="admin-status">No data.</p>`;
  const max = Math.max(...data.map(d => d.value), 1);
  const rows = data.map(d => {
    const pct = Math.max(2, (d.value / max) * 100);
    return `
      <div class="bar-row">
        <span class="bar-label" title="${esc(d.label)}">${esc(d.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
        <span class="bar-value">${esc(formatValue(d.value))}</span>
      </div>`;
  }).join("");
  return `<div class="bars">${rows}</div>`;
}

// Dual-axis line chart (revenue as area+line, orders as line) rendered as SVG.
// series: [{ bucket, revenue, orders }]
export function lineChart(series, { labelFmt = b => b } = {}) {
  if (!series || series.length === 0) return `<p class="admin-status">No data.</p>`;

  const W = 720, H = 240, padL = 8, padR = 8, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = series.length;

  const maxRev = Math.max(...series.map(s => s.revenue), 1);
  const maxOrd = Math.max(...series.map(s => s.orders), 1);

  const x = i => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yRev = v => padT + innerH - (v / maxRev) * innerH;
  const yOrd = v => padT + innerH - (v / maxOrd) * innerH;

  const revPts = series.map((s, i) => `${x(i)},${yRev(s.revenue)}`).join(" ");
  const ordPts = series.map((s, i) => `${x(i)},${yOrd(s.orders)}`).join(" ");

  // Area path under the revenue line.
  const areaPath =
    `M ${x(0)},${padT + innerH} ` +
    series.map((s, i) => `L ${x(i)},${yRev(s.revenue)}`).join(" ") +
    ` L ${x(n - 1)},${padT + innerH} Z`;

  // A few x-axis labels (first, middle, last).
  const labelIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  const xLabels = labelIdx.map(i =>
    `<text x="${x(i)}" y="${H - 8}" class="axis-label" text-anchor="middle">${esc(labelFmt(series[i].bucket))}</text>`
  ).join("");

  return `
    <div class="chart-wrap">
      <svg class="line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sales over time">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#revFill)" />
        <polyline points="${revPts}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" />
        <polyline points="${ordPts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round" />
        ${xLabels}
      </svg>
      <div class="chart-legend">
        <span class="legend-rev">Revenue</span>
        <span class="legend-ord">Orders</span>
      </div>
    </div>
    <style>.axis-label{fill:var(--muted);font-size:11px}</style>`;
}
