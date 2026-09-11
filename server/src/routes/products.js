// ---- Products router: /api/products ----
import { Router } from "express";
import * as store from "../store.js";

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
  return errors;
}

// Build a clean product object from a request body (whitelist fields).
function sanitizeProduct(body) {
  const fields = ["name", "brand", "category", "price", "rating", "emoji", "stock", "description", "specs"];
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f];
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

// POST /api/products — create
router.post("/", async (req, res, next) => {
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

// PUT /api/products/:id — update (partial allowed)
router.put("/:id", async (req, res, next) => {
  try {
    const errors = validateProduct(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    const updated = await store.updateProduct(req.params.id, sanitizeProduct(req.body));
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/products/:id — remove
router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await store.deleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ error: "Product not found" });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
