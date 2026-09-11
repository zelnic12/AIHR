// ---- Orders router: /api/orders ----
import { Router } from "express";
import * as store from "../store.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Pricing config — mirrors the frontend (cart-core.js). Totals are ALWAYS
// recomputed here; client-supplied amounts are never trusted.
const CONFIG = {
  SHIPPING_FEE: 9.99,
  FREE_SHIPPING_THRESHOLD: 100,
  TAX_RATE: 0.08,
};

const round2 = n => Math.round(n * 100) / 100;

function validateCustomer(c) {
  const errors = [];
  if (!c || typeof c !== "object") return ["customer object is required"];
  if (typeof c.name !== "string" || c.name.trim().length < 2) errors.push("customer.name is required");
  if (typeof c.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.push("valid customer.email is required");
  if (typeof c.phone !== "string" || c.phone.replace(/\D/g, "").length < 7) errors.push("valid customer.phone is required");
  if (typeof c.address !== "string" || c.address.trim().length < 4) errors.push("customer.address is required");
  if (typeof c.city !== "string" || c.city.trim().length < 2) errors.push("customer.city is required");
  if (typeof c.postal !== "string" || c.postal.trim().length < 3) errors.push("customer.postal is required");
  if (typeof c.country !== "string" || c.country.trim().length < 2) errors.push("customer.country is required");
  return errors;
}

function generateOrderId() {
  return "VE-" + Date.now().toString(36).toUpperCase() + "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

// GET /api/orders — list all orders (admin only; exposes customer PII)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    res.json(await store.getOrders());
  } catch (err) { next(err); }
});

// GET /api/orders/:id — one order (admin only; exposes customer PII)
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const order = await store.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status — update fulfilment status (admin only)
const ORDER_STATUSES = ["pending", "paid", "shipped", "cancelled"];
router.patch("/:id/status", requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Validation failed", details: [`status must be one of: ${ORDER_STATUSES.join(", ")}`] });
    }
    const updated = await store.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/orders — place an order
router.post("/", async (req, res, next) => {
  try {
    const { customer, items } = req.body || {};

    // Validate customer.
    const customerErrors = validateCustomer(customer);
    if (customerErrors.length) {
      return res.status(400).json({ error: "Validation failed", details: customerErrors });
    }

    // Validate items shape.
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Validation failed", details: ["items must be a non-empty array"] });
    }

    // Resolve each item against real products; validate stock and quantities.
    const products = await store.getProducts();
    const lineItems = [];
    const stockErrors = [];

    for (const item of items) {
      const qty = Number(item.qty);
      const product = products.find(p => p.id === Number(item.id));
      if (!product) {
        stockErrors.push(`Unknown product id ${item.id}`);
        continue;
      }
      if (!Number.isInteger(qty) || qty < 1) {
        stockErrors.push(`Invalid quantity for "${product.name}"`);
        continue;
      }
      if (qty > product.stock) {
        stockErrors.push(`Insufficient stock for "${product.name}" (requested ${qty}, available ${product.stock})`);
        continue;
      }
      lineItems.push({ id: product.id, name: product.name, price: product.price, qty });
    }

    if (stockErrors.length) {
      return res.status(409).json({ error: "Order could not be placed", details: stockErrors });
    }

    // Compute authoritative totals server-side.
    const subtotal = round2(lineItems.reduce((s, li) => s + li.price * li.qty, 0));
    const shipping = subtotal === 0 ? 0 : (subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE);
    const tax = round2(subtotal * CONFIG.TAX_RATE);
    const total = round2(subtotal + shipping + tax);

    const order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        postal: customer.postal.trim(),
        country: customer.country.trim(),
      },
      items: lineItems,
      amounts: { subtotal, shipping, tax, total },
      status: "paid", // payment handled by the gateway integration (see frontend PaymentProvider)
    };

    // Persist the order (customer upsert + items + stock decrement, atomically).
    const saved = await store.createOrder(order);

    res.status(201).json(saved);
  } catch (err) { next(err); }
});

export default router;
