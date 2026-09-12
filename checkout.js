// ---- Checkout page logic ----
const VE = window.VoltEdge;
const $ = sel => document.querySelector(sel);
const API_BASE = "/api";

/* =========================================================================
 * Payment abstraction
 * -------------------------------------------------------------------------
 * A PaymentProvider isolates payment handling so a real gateway (Stripe,
 * PayPal, Adyen, etc.) can be dropped in later WITHOUT touching the checkout
 * flow. To integrate a gateway:
 *   1. Implement a provider with the same three methods below.
 *   2. Swap the `activeProvider` assignment near the bottom of this file.
 * The checkout flow only ever talks to this interface, never to a gateway
 * directly.
 *
 *   mount(el, ctx)   -> render payment UI into `el` (card fields, wallet, …)
 *   validate()       -> { ok: boolean, message?: string }
 *   pay(order)       -> Promise<{ success, transactionId?, error? }>
 * ========================================================================= */

// Default demo provider: no real charge, just simulates a successful payment.
const MockPaymentProvider = {
  id: "mock",
  mount(el /*, ctx */) {
    el.innerHTML = `
      <div class="payment-demo">
        <span class="payment-demo-badge">Demo</span>
        <p>No real payment gateway is connected yet. Placing the order will
           simulate a successful payment. A gateway can be integrated here later.</p>
      </div>`;
  },
  validate() {
    return { ok: true };
  },
  async pay(order) {
    // Simulate network latency of a real gateway call.
    await new Promise(r => setTimeout(r, 900));
    return {
      success: true,
      transactionId: "TXN-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      order,
    };
  },
};

/* Example scaffold for a future real provider — kept as a template, unused.
const StripePaymentProvider = {
  id: "stripe",
  mount(el, ctx) { /* mount Stripe Elements into el * / },
  validate() { /* check the card element * / return { ok: true }; },
  async pay(order) {
    // const res = await fetch("/api/create-payment-intent", { ... });
    // const { clientSecret } = await res.json();
    // const result = await stripe.confirmCardPayment(clientSecret, { ... });
    // return { success: !result.error, transactionId: result.paymentIntent?.id };
  },
};
*/

// The provider currently in use. Swap this line to change gateways.
const activeProvider = MockPaymentProvider;

/* =========================================================================
 * Order summary
 * ========================================================================= */
function renderSummary() {
  const { entries, subtotal, shipping, tax, total } = VE.computeTotals();

  // Empty cart: hide the form, show a notice.
  if (entries.length === 0) {
    $("#checkoutGrid").hidden = true;
    $("#emptyCart").hidden = false;
    return { empty: true };
  }
  $("#checkoutGrid").hidden = false;
  $("#emptyCart").hidden = true;

  $("#summaryItems").innerHTML = entries.map(({ product, qty }) => `
    <div class="summary-item">
      <span class="summary-item-emoji">${product.emoji}</span>
      <div class="summary-item-info">
        <span class="summary-item-name">${VE.esc(product.name)}</span>
        <span class="summary-item-qty">Qty ${qty} × ${VE.money(product.price)}</span>
      </div>
      <strong>${VE.money(product.price * qty)}</strong>
    </div>
  `).join("");

  $("#sumSubtotal").textContent = VE.money(subtotal);
  $("#sumShipping").textContent = shipping === 0 ? "Free" : VE.money(shipping);
  $("#sumShipLabel").textContent =
    subtotal > 0 && subtotal < VE.CONFIG.FREE_SHIPPING_THRESHOLD
      ? `Shipping (free over ${VE.money(VE.CONFIG.FREE_SHIPPING_THRESHOLD)})`
      : "Shipping";
  $("#sumTax").textContent = VE.money(tax);
  $("#sumTotal").textContent = VE.money(total);
  $("#payAmount").textContent = VE.money(total);

  return { empty: false, subtotal, shipping, tax, total, entries };
}

/* =========================================================================
 * Form validation
 * ========================================================================= */
const VALIDATORS = {
  name: v => v.trim().length >= 2 || "Please enter your full name.",
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Enter a valid email address.",
  phone: v => (v.replace(/[^\d]/g, "").length >= 7) || "Enter a valid phone number.",
  address: v => v.trim().length >= 4 || "Enter your street address.",
  city: v => v.trim().length >= 2 || "Enter your city.",
  postal: v => v.trim().length >= 3 || "Enter a postal / ZIP code.",
  country: v => v.trim().length >= 2 || "Enter your country.",
};

const FIELD_IDS = {
  name: "fName", email: "fEmail", phone: "fPhone",
  address: "fAddress", city: "fCity", postal: "fPostal", country: "fCountry",
};

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errEl = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (message) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    errEl.textContent = message;
  } else {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    errEl.textContent = "";
  }
}

function collectAndValidate() {
  const data = {};
  let firstInvalid = null;

  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const value = document.getElementById(id).value;
    data[key] = value.trim();
    const result = VALIDATORS[key](value);
    if (result !== true) {
      setFieldError(id, result);
      if (!firstInvalid) firstInvalid = id;
    } else {
      setFieldError(id, "");
    }
  }

  return { valid: !firstInvalid, data, firstInvalid };
}

/* =========================================================================
 * Place order flow
 * ========================================================================= */
function buildOrder(customer, totals) {
  return {
    id: "VE-" + Date.now().toString(36).toUpperCase() + "-" +
        Math.random().toString(36).slice(2, 6).toUpperCase(),
    createdAt: new Date().toISOString(),
    customer,
    items: totals.entries.map(({ product, qty }) => ({
      id: product.id, name: product.name, price: product.price, qty,
    })),
    amounts: {
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
    },
    status: "pending",
  };
}

async function handleSubmit(e) {
  e.preventDefault();
  $("#formError").hidden = true;

  const totals = renderSummary();
  if (totals.empty) return;

  const { valid, data, firstInvalid } = collectAndValidate();
  if (!valid) {
    $("#formError").textContent = "Please fix the highlighted fields.";
    $("#formError").hidden = false;
    document.getElementById(firstInvalid)?.focus();
    return;
  }

  // Let the payment provider validate its own inputs (card fields, etc.).
  const pv = activeProvider.validate();
  if (!pv.ok) {
    $("#formError").textContent = pv.message || "Payment details are invalid.";
    $("#formError").hidden = false;
    return;
  }

  const order = buildOrder(data, totals);

  const btn = $("#placeOrderBtn");
  const originalLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Processing…";

  try {
    // 1) Run the payment provider (demo gateway for now).
    const result = await activeProvider.pay(order);
    if (!result.success) throw new Error(result.error || "Payment failed.");

    // 2) Persist the order via the backend API. The server validates stock and
    //    recomputes the authoritative totals — its response is the source of truth.
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: order.customer, items: order.items }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = Array.isArray(body.details) ? body.details.join(" ") : "";
      throw new Error([body.error, detail].filter(Boolean).join(": ") || "Could not place the order.");
    }

    // Use the server's confirmed order (id, amounts, status).
    body.transactionId = result.transactionId;
    localStorage.setItem("voltedge_last_order", JSON.stringify(body));

    // Order placed — clear the cart and show confirmation.
    VE.clearCart();
    showConfirmation(body);
  } catch (err) {
    $("#formError").textContent = err.message || "Something went wrong. Please try again.";
    $("#formError").hidden = false;
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  }
}

/* =========================================================================
 * Confirmation screen
 * ========================================================================= */
function showConfirmation(order) {
  const c = order.customer;
  $("#confirmInvoiceNo").textContent = order.invoiceNo || order.id;
  $("#confirmOrderId").textContent = order.id;
  $("#confirmTotal").textContent = VE.money(order.amounts.total);
  $("#confirmEmail").textContent = c.email;
  $("#confirmAddress").textContent =
    `${c.address}, ${c.city} ${c.postal}, ${c.country}`;

  // Invoice links use the per-order access token so the (unauthenticated)
  // customer can view only their own invoice.
  const token = encodeURIComponent(order.accessToken || "");
  const base = `${API_BASE}/orders/${encodeURIComponent(order.id)}/invoice/pdf?token=${token}`;
  const viewLink = $("#viewInvoiceLink");
  const dlLink = $("#downloadInvoiceLink");
  if (order.accessToken) {
    viewLink.href = base;
    dlLink.href = `${base}&download=1`;
    $(".confirm-actions").hidden = false;
  } else {
    $(".confirm-actions").hidden = true;
  }

  $("#checkoutView").hidden = true;
  $("#confirmationView").hidden = false;

  // Update the step indicator.
  $("#stepInfo")?.classList.remove("active");
  $("#stepInfo")?.classList.add("done");
  $("#stepDone")?.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================================
 * Init
 * ========================================================================= */
async function init() {
  // Refresh the catalog from the API so the summary reflects live prices/stock.
  try {
    await VE.loadProducts();
  } catch (err) {
    console.error("Could not refresh catalog from API; using cached data.", err);
  }

  const totals = renderSummary();
  activeProvider.mount($("#paymentMount"), { totals });
  $("#checkoutForm").addEventListener("submit", handleSubmit);

  // Clear a field's error as the user corrects it.
  Object.values(FIELD_IDS).forEach(id => {
    document.getElementById(id).addEventListener("input", () => setFieldError(id, ""));
  });
}

init();
