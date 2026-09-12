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

// ---- Reviews (public — no auth) ----
const REVIEW_NAME_MAX = 80;
const REVIEW_COMMENT_MAX = 2000;

// GET /api/products/:id/reviews — list reviews (+ stats)
router.get("/:id/reviews", async (req, res, next) => {
  try {
    const product = await store.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const [reviews, stats] = await Promise.all([
      store.getProductReviews(req.params.id),
      store.getReviewStats(req.params.id),
    ]);
    res.json({ reviews, stats });
  } catch (err) { next(err); }
});

// POST /api/products/:id/reviews — create a review (public, validated)
router.post("/:id/reviews", async (req, res, next) => {
  try {
    const product = await store.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const reviewerName = typeof req.body?.reviewerName === "string" ? req.body.reviewerName.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
    const rating = Number(req.body?.rating);

    const errors = [];
    if (reviewerName.length < 1 || reviewerName.length > REVIEW_NAME_MAX) {
      errors.push(`reviewerName must be 1–${REVIEW_NAME_MAX} characters`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("a valid email is required");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push("rating must be an integer between 1 and 5");
    }
    if (comment.length < 1 || comment.length > REVIEW_COMMENT_MAX) {
      errors.push(`comment must be 1–${REVIEW_COMMENT_MAX} characters`);
    }
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });

    // Purchase verification (server-side; never trust a client flag): the email
    // must have a non-cancelled, past-payment order containing this product.
    const purchased = await store.hasPurchasedProduct(email, req.params.id);
    if (!purchased) {
      return res.status(403).json({ error: "Only customers who have purchased this product can leave a review." });
    }

    // One review per email per product — a repeat submission edits the existing one.
    const { review, updated } = await store.createReview(req.params.id, { reviewerName, email, rating, comment });
    res.status(updated ? 200 : 201).json(review);
  } catch (err) { next(err); }
});

export default router;
