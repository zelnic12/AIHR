// ---- Product data ----
// Products are loaded from the backend API (GET /api/products) at startup.
// These are populated by init(); no hardcoded catalog lives here anymore.
let PRODUCTS = [];
let CATEGORIES = ["All"];

const API_BASE = "/api";

// Fetch the catalog from the API and refresh derived data.
async function loadProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error(`Failed to load products (HTTP ${res.status})`);
  PRODUCTS = await res.json();
  CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.category))];
}

// ---- Cart config ----
const SHIPPING_FEE = 9.99;             // Flat shipping fee below the threshold.
const FREE_SHIPPING_THRESHOLD = 100;   // Free shipping at/above this subtotal.

// ---- State ----
let state = {
  category: "All",
  search: "",
  sort: "featured",
  cart: JSON.parse(localStorage.getItem("voltedge_cart") || "{}"),
};

// ---- Helpers ----
const money = n => "$" + n.toFixed(2);
const $ = sel => document.querySelector(sel);
const saveCart = () => localStorage.setItem("voltedge_cart", JSON.stringify(state.cart));
const getProduct = id => PRODUCTS.find(p => p.id === Number(id));
// Escape any dynamic text before injecting into innerHTML.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Discount helper. Returns { original, sale, pct } only when a product carries
// a valid sale (originalPrice/salePrice or price + compareAtPrice). Returns null
// otherwise, so cards/detail render normally when there is no discount.
function discountInfo(p) {
  const original = Number(p.originalPrice ?? p.compareAtPrice);
  const sale = Number(p.salePrice ?? p.price);
  if (!original || !sale || original <= sale) return null;
  const pct = Math.round((1 - sale / original) * 100);
  return { original, sale, pct };
}

// ---- Render category filters ----
function renderFilters() {
  const wrap = $("#categoryFilters");
  wrap.innerHTML = CATEGORIES.map(cat =>
    `<button class="filter-chip ${cat === state.category ? "active" : ""}" data-cat="${esc(cat)}">${esc(cat)}</button>`
  ).join("");
  wrap.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      renderFilters();
      renderProducts();
    });
  });
}

// ---- Render products ----
function getVisibleProducts() {
  let list = PRODUCTS.filter(p => {
    const matchCat = state.category === "All" || p.category === state.category;
    const matchSearch =
      p.name.toLowerCase().includes(state.search) ||
      p.brand.toLowerCase().includes(state.search) ||
      p.category.toLowerCase().includes(state.search);
    return matchCat && matchSearch;
  });

  switch (state.sort) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "rating": list.sort((a, b) => b.rating - a.rating); break;
  }
  return list;
}

function renderProducts() {
  const grid = $("#productGrid");
  const list = getVisibleProducts();
  $("#emptyState").hidden = list.length !== 0;

  grid.innerHTML = list.map(p => {
    const out = p.stock <= 0;
    const low = !out && p.stock <= 5;
    const stockTag = out
      ? `<span class="stock-pill out">Out of stock</span>`
      : low ? `<span class="stock-pill low">Only ${p.stock} left</span>` : "";
    const d = discountInfo(p);
    const saleTag = d ? `<span class="sale-badge">${d.pct}% OFF</span>` : "";
    const priceBlock = d
      ? `<div class="card-prices">
           <span class="card-price on-sale">${money(d.sale)}</span>
           <span class="price-original">${money(d.original)}</span>
         </div>`
      : `<span class="card-price">${money(p.price)}</span>`;
    return `
    <article class="card ${out ? "is-out" : ""}" data-view="${p.id}" tabindex="0" role="button" aria-label="View details for ${esc(p.name)}">
      <div class="card-media">${p.emoji}${stockTag}${saleTag}</div>
      <div class="card-body">
        <span class="card-cat">${esc(p.brand)} · ${esc(p.category)}</span>
        <span class="card-name">${esc(p.name)}</span>
        <span class="card-rating">★ ${p.rating.toFixed(1)}</span>
        <div class="card-bottom">
          ${priceBlock}
          <button class="add-btn" data-add="${p.id}" ${out ? "disabled" : ""}>${out ? "Sold out" : "Add to cart"}</button>
        </div>
      </div>
    </article>`;
  }).join("");

  // Add-to-cart button (stop propagation so it doesn't open the detail view).
  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.add));
    });
  });

  // Whole card opens the detail view (click + keyboard).
  grid.querySelectorAll("[data-view]").forEach(card => {
    const open = () => openProduct(Number(card.dataset.view));
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

// ---- Product detail view ----
function renderProductDetail(product) {
  const out = product.stock <= 0;
  const low = !out && product.stock <= 5;
  const stockLine = out
    ? `<span class="detail-stock out">● Out of stock</span>`
    : low ? `<span class="detail-stock low">● Only ${product.stock} left in stock</span>`
          : `<span class="detail-stock in">● In stock (${product.stock} available)</span>`;

  const specsRows = Object.entries(product.specs)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("");

  return `
    <div class="detail-media">
      <div class="detail-emoji">${product.emoji}</div>
    </div>
    <div class="detail-info">
      <span class="detail-brand">${esc(product.brand)} · ${esc(product.category)}</span>
      <h2 id="detailTitle" class="detail-name">${esc(product.name)}</h2>
      <div class="detail-rating">★ ${product.rating.toFixed(1)}</div>
      ${(() => {
        const d = discountInfo(product);
        return d
          ? `<div class="detail-prices">
               <span class="detail-price on-sale">${money(d.sale)}</span>
               <span class="detail-price-original">${money(d.original)}</span>
               <span class="detail-price-off">${d.pct}% OFF</span>
             </div>`
          : `<div class="detail-prices"><span class="detail-price">${money(product.price)}</span></div>`;
      })()}
      ${stockLine}
      <p class="detail-desc">${esc(product.description)}</p>

      <div class="detail-buy ${out ? "is-out" : ""}">
        <div class="qty detail-qty" ${out ? "aria-disabled=\"true\"" : ""}>
          <button id="detailQtyDec" aria-label="Decrease quantity" ${out ? "disabled" : ""}>−</button>
          <span id="detailQtyVal">1</span>
          <button id="detailQtyInc" aria-label="Increase quantity" ${out ? "disabled" : ""}>+</button>
        </div>
        <button id="detailAddBtn" class="btn btn-secondary" ${out ? "disabled" : ""}>
          ${out ? "Out of stock" : "Add to Cart"}
        </button>
        <button id="detailBuyBtn" class="btn btn-primary" ${out ? "disabled" : ""}>
          Buy Now
        </button>
      </div>

      <div class="detail-specs">
        <h3>Specifications</h3>
        <table><tbody>${specsRows}</tbody></table>
      </div>
    </div>`;
}

function openProduct(id, updateHash = true) {
  const product = getProduct(id);
  if (!product) return;

  const body = $("#detailBody");
  body.innerHTML = renderProductDetail(product);

  // Quantity selector (bounded by available stock, min 1).
  let qty = 1;
  const qtyVal = $("#detailQtyVal");
  const dec = $("#detailQtyDec");
  const inc = $("#detailQtyInc");
  if (product.stock > 0) {
    dec.addEventListener("click", () => { qty = Math.max(1, qty - 1); qtyVal.textContent = qty; });
    inc.addEventListener("click", () => { qty = Math.min(product.stock, qty + 1); qtyVal.textContent = qty; });
    $("#detailAddBtn").addEventListener("click", () => {
      addToCart(product.id, qty);
      closeProduct();
    });
    // Buy Now: add to cart and go straight to checkout (reuses existing flow).
    $("#detailBuyBtn").addEventListener("click", () => {
      addToCart(product.id, qty);
      window.location.href = "checkout.html";
    });
  }

  const overlay = $("#detailOverlay");
  const modal = $("#detailModal");
  overlay.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  $("#detailClose").focus();

  if (updateHash) history.replaceState(null, "", `#product/${id}`);
}

function closeProduct(updateHash = true) {
  const overlay = $("#detailOverlay");
  const modal = $("#detailModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  if (updateHash && location.hash.startsWith("#product/")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

// ---- Cart logic ----
function addToCart(id, qty = 1) {
  const product = getProduct(id);
  if (!product || product.stock <= 0) return;
  const current = state.cart[id] || 0;
  // Never let cart quantity exceed available stock.
  state.cart[id] = Math.min(product.stock, current + qty);
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  const product = getProduct(id);
  const next = (state.cart[id] || 0) + delta;
  if (next <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = product ? Math.min(product.stock, next) : next;
  }
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  delete state.cart[id];
  saveCart();
  renderCart();
}

function cartEntries() {
  return Object.entries(state.cart).map(([id, qty]) => ({
    product: getProduct(id),
    qty,
  })).filter(e => e.product);
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((s, e) => s + e.qty, 0);
  const subtotal = entries.reduce((s, e) => s + e.qty * e.product.price, 0);

  // Shipping: free over the threshold, otherwise a flat fee; nothing to ship if empty.
  const shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
  const total = subtotal + shipping;

  // Header count.
  $("#cartCount").textContent = count;

  // Summary breakdown.
  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartShipping").textContent = shipping === 0 ? "Free" : money(shipping);
  $("#cartTotal").textContent = money(total);
  $("#shippingLabel").textContent =
    subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD
      ? `Shipping (free over ${money(FREE_SHIPPING_THRESHOLD)})`
      : "Shipping";

  // Disable checkout on an empty cart.
  $("#checkoutBtn").disabled = entries.length === 0;

  const container = $("#cartItems");
  if (entries.length === 0) {
    container.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = entries.map(({ product, qty }) => {
    const atMax = qty >= product.stock;
    return `
    <div class="cart-item">
      <div class="cart-item-media">${product.emoji}</div>
      <div>
        <div class="cart-item-name">${esc(product.name)}</div>
        <div class="cart-item-price">${money(product.price)}</div>
        <div class="qty">
          <button data-dec="${product.id}" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button data-inc="${product.id}" aria-label="Increase quantity" ${atMax ? "disabled" : ""}>+</button>
          <button class="remove-btn" data-remove="${product.id}">Remove</button>
        </div>
        ${atMax ? `<div class="qty-max-note">Max stock reached</div>` : ""}
      </div>
      <strong>${money(product.price * qty)}</strong>
    </div>`;
  }).join("");

  container.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => changeQty(Number(b.dataset.inc), 1)));
  container.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => changeQty(Number(b.dataset.dec), -1)));
  container.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => removeFromCart(Number(b.dataset.remove))));
}

// ---- Cart drawer open/close ----
function openCart() {
  $("#cartDrawer").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
  $("#cartOverlay").hidden = false;
}
function closeCart() {
  $("#cartDrawer").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden", "true");
  $("#cartOverlay").hidden = true;
}

// ---- Events ----
$("#searchInput").addEventListener("input", e => {
  state.search = e.target.value.trim().toLowerCase();
  renderProducts();
});
$("#sortSelect").addEventListener("change", e => {
  state.sort = e.target.value;
  renderProducts();
});
$("#cartBtn").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
$("#cartOverlay").addEventListener("click", closeCart);
$("#detailClose").addEventListener("click", () => closeProduct());
$("#detailOverlay").addEventListener("click", () => closeProduct());
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if ($("#detailModal").classList.contains("open")) closeProduct();
    else closeCart();
  }
});
$("#checkoutBtn").addEventListener("click", () => {
  if (cartEntries().length === 0) return;
  // Cart is persisted in localStorage; the checkout page reads it from there.
  window.location.href = "checkout.html";
});

// Open a product directly from a #product/<id> URL (shareable / refresh-safe).
function handleHash() {
  const m = location.hash.match(/^#product\/(\d+)$/);
  if (m) openProduct(Number(m[1]), false);
}
window.addEventListener("hashchange", handleHash);

// ---- Init ----
async function init() {
  const grid = $("#productGrid");
  const empty = $("#emptyState");

  // Loading state.
  empty.hidden = true;
  grid.innerHTML = `<p class="grid-status">Loading products…</p>`;

  // Cart count reflects persisted cart immediately.
  renderCart();

  try {
    await loadProducts();
    renderFilters();
    renderProducts();
    handleHash();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="grid-status error">
        <p>Sorry — we couldn't load the catalog.</p>
        <button id="retryLoad" class="btn btn-primary">Try again</button>
      </div>`;
    $("#retryLoad")?.addEventListener("click", init);
  }
}

init();
