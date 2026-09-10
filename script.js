// ---- Product data ----
const PRODUCTS = [
  {
    id: 1, name: "AeroBook Pro 14", brand: "Aero", category: "Laptops",
    price: 1499.00, rating: 4.8, emoji: "💻", stock: 12,
    description: "A pro-grade 14-inch laptop built for creators and developers. All-day battery, a stunning display, and serious performance in a thin aluminium body.",
    specs: { Display: "14.2\" Liquid Retina, 120Hz", Processor: "AeroChip M3 Pro (10-core)", Memory: "16GB unified", Storage: "512GB SSD", Battery: "Up to 18 hours", Weight: "1.6 kg" }
  },
  {
    id: 2, name: "AeroBook Air 13", brand: "Aero", category: "Laptops",
    price: 999.00, rating: 4.6, emoji: "💻", stock: 25,
    description: "Featherlight and fanless, the Air 13 is the everyday laptop for work, study and streaming. Silent, cool, and impossibly portable.",
    specs: { Display: "13.6\" Liquid Retina", Processor: "AeroChip M3 (8-core)", Memory: "8GB unified", Storage: "256GB SSD", Battery: "Up to 20 hours", Weight: "1.24 kg" }
  },
  {
    id: 3, name: "Nimbus Gaming Laptop", brand: "Nimbus", category: "Laptops",
    price: 1899.00, rating: 4.7, emoji: "💻", stock: 5,
    description: "A high-refresh gaming powerhouse with desktop-class graphics and advanced vapor-chamber cooling. Play the latest titles at max settings.",
    specs: { Display: "16\" QHD+ 240Hz", Processor: "Octa-core 5.0GHz", Graphics: "RTX 4070 8GB", Memory: "32GB DDR5", Storage: "1TB NVMe SSD", Battery: "Up to 6 hours" }
  },
  {
    id: 4, name: "Pulse X Smartphone", brand: "Pulse", category: "Phones",
    price: 899.00, rating: 4.5, emoji: "📱", stock: 40,
    description: "The flagship Pulse X pairs a pro camera system with a brilliant OLED display and blazing-fast 5G. Photography and performance without compromise.",
    specs: { Display: "6.5\" OLED 120Hz", Camera: "50MP triple system", Chipset: "PulseCore 9", Storage: "256GB", Battery: "4500 mAh", Charging: "65W fast charge" }
  },
  {
    id: 5, name: "Pulse Lite Smartphone", brand: "Pulse", category: "Phones",
    price: 449.00, rating: 4.2, emoji: "📱", stock: 0,
    description: "All the Pulse essentials at an approachable price. Great battery life, a crisp display, and a dependable dual camera for everyday shots.",
    specs: { Display: "6.4\" LCD 90Hz", Camera: "48MP dual system", Chipset: "PulseCore 6", Storage: "128GB", Battery: "5000 mAh", Charging: "33W fast charge" }
  },
  {
    id: 6, name: "Pulse Ultra 5G", brand: "Pulse", category: "Phones",
    price: 1199.00, rating: 4.9, emoji: "📱", stock: 8,
    description: "The most advanced Pulse ever. A quad-camera array, titanium frame, and the fastest chipset in the lineup for those who want it all.",
    specs: { Display: "6.8\" LTPO OLED 120Hz", Camera: "108MP quad system", Chipset: "PulseCore 9 Ultra", Storage: "512GB", Battery: "5000 mAh", Charging: "100W fast charge" }
  },
  {
    id: 7, name: "EchoBuds Pro", brand: "Echo", category: "Audio",
    price: 199.00, rating: 4.6, emoji: "🎧", stock: 60,
    description: "True-wireless earbuds with adaptive active noise cancellation and rich, balanced sound. Compact charging case with wireless charging.",
    specs: { Type: "In-ear true wireless", "Noise cancelling": "Adaptive ANC", Battery: "6h + 24h case", Connectivity: "Bluetooth 5.3", "Water resistance": "IPX4", Charging: "USB-C + Qi wireless" }
  },
  {
    id: 8, name: "SonicWave Headphones", brand: "Sonic", category: "Audio",
    price: 279.00, rating: 4.7, emoji: "🎧", stock: 18,
    description: "Over-ear wireless headphones with plush memory-foam cushions and studio-grade drivers for immersive, fatigue-free listening.",
    specs: { Type: "Over-ear wireless", "Noise cancelling": "Hybrid ANC", Battery: "Up to 40 hours", Connectivity: "Bluetooth 5.2", Drivers: "40mm dynamic", Weight: "255 g" }
  },
  {
    id: 9, name: "BoomBox Mini Speaker", brand: "Boom", category: "Audio",
    price: 89.00, rating: 4.3, emoji: "🔊", stock: 33,
    description: "A pocket-sized Bluetooth speaker with surprising punch. Rugged, waterproof, and ready for the beach, the trail, or the shower.",
    specs: { Type: "Portable Bluetooth", Output: "12W", Battery: "Up to 12 hours", "Water resistance": "IP67", Connectivity: "Bluetooth 5.1", Weight: "540 g" }
  },
  {
    id: 10, name: "Vortex Console X", brand: "Vortex", category: "Gaming",
    price: 499.00, rating: 4.8, emoji: "🎮", stock: 0,
    description: "The next-gen Vortex Console X delivers 4K gaming at up to 120fps, near-instant load times, and a huge library of titles.",
    specs: { Resolution: "Up to 4K 120fps", Storage: "1TB SSD", Memory: "16GB GDDR6", "Optical drive": "4K UHD Blu-ray", Ports: "HDMI 2.1, 3x USB", Output: "8K ready" }
  },
  {
    id: 11, name: "Vortex Wireless Pad", brand: "Vortex", category: "Gaming",
    price: 69.00, rating: 4.4, emoji: "🎮", stock: 50,
    description: "A precision wireless controller with textured grips, haptic triggers, and a rechargeable battery that lasts through marathon sessions.",
    specs: { Connectivity: "Wireless + USB-C", Battery: "Up to 30 hours", Feedback: "Haptic triggers", Compatibility: "Console X, PC", "3.5mm jack": "Yes", Weight: "280 g" }
  },
  {
    id: 12, name: "RayCast 4K Monitor", brand: "RayCast", category: "Gaming",
    price: 549.00, rating: 4.6, emoji: "🖥️", stock: 9,
    description: "A 27-inch 4K gaming monitor with a 144Hz refresh rate, 1ms response and HDR for crisp, tear-free, vibrant gameplay.",
    specs: { Size: "27\" IPS", Resolution: "3840 × 2160 (4K)", "Refresh rate": "144Hz", "Response time": "1ms", HDR: "DisplayHDR 600", Ports: "HDMI 2.1, DisplayPort" }
  },
  {
    id: 13, name: "HomeHub Smart Speaker", brand: "HomeHub", category: "Smart Home",
    price: 129.00, rating: 4.1, emoji: "🏠", stock: 22,
    description: "A voice-controlled smart speaker that plays your music, answers questions, and controls your smart home — all hands-free.",
    specs: { Assistant: "Built-in voice AI", Audio: "360° room-filling", Connectivity: "Wi-Fi + Bluetooth", "Smart home": "Matter / Thread hub", Mics: "4 far-field", Power: "AC powered" }
  },
  {
    id: 14, name: "GlowBulb Smart Light", brand: "Glow", category: "Smart Home",
    price: 29.00, rating: 4.0, emoji: "💡", stock: 120,
    description: "A color-changing smart bulb with 16 million colors, schedules and voice control. Set the perfect mood from your phone.",
    specs: { Colors: "16 million", Brightness: "800 lumens", Connectivity: "Wi-Fi (no hub)", Control: "App + voice", Lifespan: "25,000 hours", Fitting: "E27 / A19" }
  },
  {
    id: 15, name: "SecureCam 2K", brand: "Secure", category: "Smart Home",
    price: 149.00, rating: 4.5, emoji: "📷", stock: 14,
    description: "A 2K indoor security camera with night vision, motion alerts and two-way audio. Keep an eye on home from anywhere.",
    specs: { Resolution: "2K (2304 × 1296)", "Night vision": "Infrared, 10m", Field: "130° wide angle", Audio: "Two-way", Storage: "microSD + cloud", Connectivity: "Wi-Fi" }
  },
  {
    id: 16, name: "ChronoWatch Series 6", brand: "Chrono", category: "Wearables",
    price: 399.00, rating: 4.7, emoji: "⌚", stock: 16,
    description: "A premium smartwatch with advanced health tracking, GPS and an always-on display. Your fitness coach and daily assistant on your wrist.",
    specs: { Display: "1.9\" AMOLED always-on", Health: "ECG, SpO2, heart rate", GPS: "Dual-band", Battery: "Up to 36 hours", "Water resistance": "50m", Connectivity: "Bluetooth + LTE" }
  },
  {
    id: 17, name: "FitBand Active", brand: "Chrono", category: "Wearables",
    price: 99.00, rating: 4.2, emoji: "⌚", stock: 45,
    description: "A slim fitness band that tracks steps, sleep and workouts with a week-long battery. Motivation you can wear all day.",
    specs: { Display: "1.1\" AMOLED", Health: "Heart rate, sleep, SpO2", Battery: "Up to 7 days", "Water resistance": "5 ATM", Modes: "30+ sport modes", Weight: "24 g" }
  },
  {
    id: 18, name: "PowerCell 20K Battery", brand: "PowerCell", category: "Accessories",
    price: 49.00, rating: 4.6, emoji: "🔋", stock: 80,
    description: "A 20,000mAh power bank with fast charging and three ports. Keep your phone, tablet and earbuds topped up on the go.",
    specs: { Capacity: "20,000 mAh", Output: "65W USB-C PD", Ports: "2x USB-C, 1x USB-A", Input: "USB-C fast recharge", Display: "LED charge level", Weight: "355 g" }
  },
];

const CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.category))];

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
    return `
    <article class="card ${out ? "is-out" : ""}" data-view="${p.id}" tabindex="0" role="button" aria-label="View details for ${esc(p.name)}">
      <div class="card-media">${p.emoji}${stockTag}</div>
      <div class="card-body">
        <span class="card-cat">${esc(p.category)}</span>
        <span class="card-name">${esc(p.name)}</span>
        <span class="card-rating">★ ${p.rating.toFixed(1)}</span>
        <div class="card-bottom">
          <span class="card-price">${money(p.price)}</span>
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
      <div class="detail-price">${money(product.price)}</div>
      ${stockLine}
      <p class="detail-desc">${esc(product.description)}</p>

      <div class="detail-buy ${out ? "is-out" : ""}">
        <div class="qty detail-qty" ${out ? "aria-disabled=\"true\"" : ""}>
          <button id="detailQtyDec" aria-label="Decrease quantity" ${out ? "disabled" : ""}>−</button>
          <span id="detailQtyVal">1</span>
          <button id="detailQtyInc" aria-label="Increase quantity" ${out ? "disabled" : ""}>+</button>
        </div>
        <button id="detailAddBtn" class="btn btn-primary" ${out ? "disabled" : ""}>
          ${out ? "Out of stock" : "Add to Cart"}
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
  const total = entries.reduce((s, e) => s + e.qty * e.product.price, 0);

  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = money(total);

  const container = $("#cartItems");
  if (entries.length === 0) {
    container.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = entries.map(({ product, qty }) => `
    <div class="cart-item">
      <div class="cart-item-media">${product.emoji}</div>
      <div>
        <div class="cart-item-name">${esc(product.name)}</div>
        <div class="cart-item-price">${money(product.price)}</div>
        <div class="qty">
          <button data-dec="${product.id}" aria-label="Decrease quantity">−</button>
          <span>${qty}</span>
          <button data-inc="${product.id}" aria-label="Increase quantity">+</button>
          <button class="remove-btn" data-remove="${product.id}">Remove</button>
        </div>
      </div>
      <strong>${money(product.price * qty)}</strong>
    </div>
  `).join("");

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
  state.cart = {};
  saveCart();
  renderCart();
  const msg = $("#checkoutMsg");
  msg.hidden = false;
  setTimeout(() => { msg.hidden = true; }, 4000);
});

// Open a product directly from a #product/<id> URL (shareable / refresh-safe).
function handleHash() {
  const m = location.hash.match(/^#product\/(\d+)$/);
  if (m) openProduct(Number(m[1]), false);
}
window.addEventListener("hashchange", handleHash);

// ---- Init ----
renderFilters();
renderProducts();
renderCart();
handleHash();
