// ---- Products router: /api/products ----
import { Router } from "express";
import * as store from "../store.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Validate a product payload. `partial` allows missing fields (for PUT updates).
function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const has = k => body[k] !== undefined && body[k] !== null;

  if (!partial || has("name")) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("name must be a string of at least 2 characters");
    }
  }
  if (!partial || has("price")) {
    if (typeof body.price !== "number" || body.price < 0 || Number.isNaN(body.price)) {
      errors.push("price must be a non-negative number");
    }
  }
  if (!partial || has("stock")) {
    if (!Number.isInteger(body.stock) || body.stock < 0) {
      errors.push("stock must be a non-negative integer");
    }
  }
  if (has("rating") && (typeof body.rating !== "number" || body.rating < 0 || body.rating > 5)) {
    errors.push("rating must be a number between 0 and 5");
  }
  if (has("specs") && (typeof body.specs !== "object" || Array.isArray(body.specs))) {
    errors.push("specs must be an object");
  }
  // sale_price: null clears the promotion. When present it must be a
  // non-negative number and not exceed the regular price.
  if (body.sale_price !== undefined && body.sale_price !== null) {
    if (typeof body.sale_price !== "number" || Number.isNaN(body.sale_price) || body.sale_price < 0) {
      errors.push("sale_price must be a non-negative number or null");
    } else if (typeof body.price === "number" && body.sale_price > body.price) {
      errors.push("sale_price cannot be greater than price");
    }
  }
  return errors;
}

// Build a clean product object from a request body (whitelist fields).
function sanitizeProduct(body) {
  const fields = ["name", "brand", "category", "price", "sale_price", "rating", "emoji", "stock", "description", "specs"];
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f];
  // Normalize: sale_price === price (or 0) means "no discount" → store as null.
  if (out.sale_price !== undefined && out.sale_price !== null) {
    if (typeof out.price === "number" && out.sale_price >= out.price) out.sale_price = null;
  }
  return out;
}

// GET /api/products — list all products
router.get("/", async (req, res, next) => {
  try {
    res.json(await store.getProducts());
  } catch (err) { next(err); }
});

// GET /api/products/:id — one product
router.get("/:id", async (req, res, next) => {
  try {
    const product = await store.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) { next(err); }
});

// POST /api/products — create (admin only)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const errors = validateProduct(req.body, { partial: false });
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    const data = sanitizeProduct(req.body);
    // Sensible defaults for optional fields.
    data.brand ??= "";
    data.category ??= "Uncategorized";
    data.rating ??= 0;
    data.emoji ??= "📦";
    data.description ??= "";
    data.specs ??= {};

    const product = await store.createProduct(data);
    res.status(201).json(product);
  } catch (err) { next(err); }
});

// PUT /api/products/:id — update (partial allowed, admin only)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const errors = validateProduct(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    const data = sanitizeProduct(req.body);

    // Guard: if sale_price is being set without a new price, compare against the
    // product's existing price so a promo can never exceed the list price.
    if (data.sale_price != null && data.price === undefined) {
      const existing = await store.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (data.sale_price >= existing.price) data.sale_price = null; // treat as no discount
    }

    const updated = await store.updateProduct(req.params.id, data);
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/products/:id — remove (admin only)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const ok = await store.deleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: "Product not found" });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
