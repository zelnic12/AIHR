// ---- Midtrans Snap payment provider ----
// Wraps the official `midtrans-client` Snap API. Credentials come from the
// environment (never hardcoded):
//
//   MIDTRANS_SERVER_KEY     (required to enable the gateway)
//   MIDTRANS_CLIENT_KEY     (returned to the frontend to open the Snap popup)
//   MIDTRANS_IS_PRODUCTION  ("true" = production; anything else / unset = sandbox)
//
// If MIDTRANS_SERVER_KEY is not set, the gateway is treated as DISABLED: order
// placement still succeeds, but no Snap transaction is created. This keeps local
// development and demos working without live credentials, and guarantees local
// dev never accidentally hits production (default is sandbox).

import midtransClient from "midtrans-client";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
// Default to sandbox unless explicitly "true".
const IS_PRODUCTION = String(process.env.MIDTRANS_IS_PRODUCTION || "false").toLowerCase() === "true";

// QRIS-only channels. Per Midtrans Snap docs, QRIS is offered via the "gopay"
// and "other_qris" channel keys. Override with MIDTRANS_ENABLED_PAYMENTS
// (comma-separated) if the owner later wants to enable more methods.
const ENABLED_PAYMENTS = (process.env.MIDTRANS_ENABLED_PAYMENTS || "gopay,other_qris")
  .split(",").map(s => s.trim()).filter(Boolean);

let snap = null;
if (SERVER_KEY) {
  snap = new midtransClient.Snap({
    isProduction: IS_PRODUCTION,
    serverKey: SERVER_KEY,
    clientKey: CLIENT_KEY,
  });
  console.log(`✓ Midtrans Snap enabled (${IS_PRODUCTION ? "PRODUCTION" : "sandbox"}), channels: ${ENABLED_PAYMENTS.join(", ")}`);
} else {
  console.warn("⚠  MIDTRANS_SERVER_KEY not set — payment gateway disabled (orders will be placed without a Snap transaction).");
}

export function isPaymentEnabled() {
  return !!snap;
}

// The publishable client key + mode, safe to expose to the browser so it can
// load the correct Snap.js and open the popup.
export function getClientConfig() {
  return { clientKey: CLIENT_KEY, isProduction: IS_PRODUCTION, enabled: isPaymentEnabled() };
}

// Create a Snap transaction for a persisted order.
// `order` is the mapOrder()-shaped object (id, amounts, customer, items).
// Returns { token, redirectUrl } or null when the gateway is disabled.
// Throws on a genuine gateway error (caller decides how fatal that is).
export async function createSnapTransaction(order) {
  if (!snap) return null;

  // Midtrans requires gross_amount as an integer (IDR has no cents). It MUST
  // equal the sum of item_details amounts, so we send the order total as a
  // single line item to avoid rounding mismatches.
  const grossAmount = Math.round(Number(order.amounts.total));

  const c = order.customer || {};
  const nameParts = String(c.name || "Customer").trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ");

  const parameter = {
    transaction_details: {
      order_id: order.id,          // use the order's own id as Midtrans order_id
      gross_amount: grossAmount,   // server-computed total (authoritative)
    },
    // Restrict to QRIS-only channels.
    enabled_payments: ENABLED_PAYMENTS,
    item_details: [
      {
        id: order.id,
        name: `Order ${order.id}`.slice(0, 50),
        price: grossAmount,
        quantity: 1,
      },
    ],
    customer_details: {
      first_name: firstName.slice(0, 20),
      last_name: lastName.slice(0, 20),
      email: c.email || undefined,
      phone: c.phone || undefined,
    },
    credit_card: { secure: true },
  };

  const result = await snap.createTransaction(parameter);
  return { token: result.token, redirectUrl: result.redirect_url };
}
