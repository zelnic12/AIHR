// Admin dashboard entry point. Handles top-level navigation between views and
// delegates rendering to modular view functions. State lives in the URL hash
// so views are refresh-safe and linkable (#products, #orders, #sales).
import { renderOverview } from "./views/overview.js";
import { renderProducts } from "./views/products.js";
import { renderOrders } from "./views/orders.js";
import { renderSales } from "./views/sales.js";

const VIEWS = {
  overview: { title: "Overview", render: renderOverview },
  products: { title: "Products", render: renderProducts },
  orders:   { title: "Orders", render: renderOrders },
  sales:    { title: "Sales performance", render: renderSales },
};

const root = document.getElementById("viewRoot");
const title = document.getElementById("viewTitle");
const nav = document.getElementById("adminNav");

let current = "overview";

function setActiveNav(view) {
  nav.querySelectorAll(".admin-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

async function show(view) {
  const cfg = VIEWS[view] || VIEWS.overview;
  current = VIEWS[view] ? view : "overview";
  title.textContent = cfg.title;
  setActiveNav(current);
  if (location.hash !== `#${current}`) history.replaceState(null, "", `#${current}`);
  await cfg.render(root);
}

// Nav clicks
nav.addEventListener("click", e => {
  const btn = e.target.closest(".admin-nav-item");
  if (btn) show(btn.dataset.view);
});

// Refresh re-renders the current view.
document.getElementById("refreshBtn").addEventListener("click", () => show(current));

// Hash routing (initial + back/forward).
window.addEventListener("hashchange", () => {
  const view = location.hash.replace("#", "") || "overview";
  if (view !== current) show(view);
});

// Init from hash.
show(location.hash.replace("#", "") || "overview");
