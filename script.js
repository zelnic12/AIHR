// ---- Product data ----
const PRODUCTS = [
  { id: 1,  name: "AeroBook Pro 14", category: "Laptops", price: 1499.00, rating: 4.8, emoji: "💻" },
  { id: 2,  name: "AeroBook Air 13", category: "Laptops", price: 999.00, rating: 4.6, emoji: "💻" },
  { id: 3,  name: "Nimbus Gaming Laptop", category: "Laptops", price: 1899.00, rating: 4.7, emoji: "💻" },
  { id: 4,  name: "Pulse X Smartphone", category: "Phones", price: 899.00, rating: 4.5, emoji: "📱" },
  { id: 5,  name: "Pulse Lite Smartphone", category: "Phones", price: 449.00, rating: 4.2, emoji: "📱" },
  { id: 6,  name: "Pulse Ultra 5G", category: "Phones", price: 1199.00, rating: 4.9, emoji: "📱" },
  { id: 7,  name: "EchoBuds Pro", category: "Audio", price: 199.00, rating: 4.6, emoji: "🎧" },
  { id: 8,  name: "SonicWave Headphones", category: "Audio", price: 279.00, rating: 4.7, emoji: "🎧" },
  { id: 9,  name: "BoomBox Mini Speaker", category: "Audio", price: 89.00, rating: 4.3, emoji: "🔊" },
  { id: 10, name: "Vortex Console X", category: "Gaming", price: 499.00, rating: 4.8, emoji: "🎮" },
  { id: 11, name: "Vortex Wireless Pad", category: "Gaming", price: 69.00, rating: 4.4, emoji: "🎮" },
  { id: 12, name: "RayCast 4K Monitor", category: "Gaming", price: 549.00, rating: 4.6, emoji: "🖥️" },
  { id: 13, name: "HomeHub Smart Speaker", category: "Smart Home", price: 129.00, rating: 4.1, emoji: "🏠" },
  { id: 14, name: "GlowBulb Smart Light", category: "Smart Home", price: 29.00, rating: 4.0, emoji: "💡" },
  { id: 15, name: "SecureCam 2K", category: "Smart Home", price: 149.00, rating: 4.5, emoji: "📷" },
  { id: 16, name: "ChronoWatch Series 6", category: "Wearables", price: 399.00, rating: 4.7, emoji: "⌚" },
  { id: 17, name: "FitBand Active", category: "Wearables", price: 99.00, rating: 4.2, emoji: "⌚" },
  { id: 18, name: "PowerCell 20K Battery", category: "Accessories", price: 49.00, rating: 4.6, emoji: "🔋" },
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

// ---- Render category filters ----
function renderFilters() {
  const wrap = $("#categoryFilters");
  wrap.innerHTML = CATEGORIES.map(cat =>
    `<button class="filter-chip ${cat === state.category ? "active" : ""}" data-cat="${cat}">${cat}</button>`
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

  grid.innerHTML = list.map(p => `
    <article class="card">
      <div class="card-media">${p.emoji}</div>
      <div class="card-body">
        <span class="card-cat">${p.category}</span>
        <span class="card-name">${p.name}</span>
        <span class="card-rating">★ ${p.rating.toFixed(1)}</span>
        <div class="card-bottom">
          <span class="card-price">${money(p.price)}</span>
          <button class="add-btn" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.add)));
  });
}

// ---- Cart logic ----
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveCart();
  renderCart();
  openCart();
}

function changeQty(id, delta) {
  state.cart[id] = (state.cart[id] || 0) + delta;
  if (state.cart[id] <= 0) delete state.cart[id];
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
    product: PRODUCTS.find(p => p.id === Number(id)),
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
        <div class="cart-item-name">${product.name}</div>
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
$("#checkoutBtn").addEventListener("click", () => {
  if (cartEntries().length === 0) return;
  state.cart = {};
  saveCart();
  renderCart();
  const msg = $("#checkoutMsg");
  msg.hidden = false;
  setTimeout(() => { msg.hidden = true; }, 4000);
});

// ---- Init ----
renderFilters();
renderProducts();
renderCart();
