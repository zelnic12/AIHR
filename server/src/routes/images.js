// ---- Admin product image management: /api/admin/products/:id/images ----
// All routes are admin-only (requireAuth). Images are stored on disk under
// server/uploads/products and served at /uploads/products/<file>. The DB stores
// only the URL/path (never the binary).
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as store from "../store.js";
import { requireAuth } from "../auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "products");

// Allowed image types → canonical extension.
const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Store to disk with a safe, random filename (prevents path traversal and
// filename collisions — the client's filename is never used for the path).
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); cb(null, UPLOAD_DIR); }
    catch (err) { cb(err); }
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || ".bin";
    const safe = crypto.randomBytes(16).toString("hex");
    cb(null, `p${Number(req.params.id) || 0}-${Date.now()}-${safe}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new Error("Unsupported file type. Allowed: JPG, PNG, WebP."));
  },
});

const router = Router();

// Ensure the product exists before any image operation.
async function ensureProduct(req, res, next) {
  const product = await store.getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  req.product = product;
  next();
}

// GET /api/admin/products/:id/images — list images (admin)
router.get("/:id/images", requireAuth, ensureProduct, async (req, res, next) => {
  try {
    res.json(await store.getProductImages(req.params.id));
  } catch (err) { next(err); }
});

// POST /api/admin/products/:id/images — upload one or more images (admin)
// Multipart field name: "images" (accepts up to 10).
router.post("/:id/images", requireAuth, ensureProduct, (req, res, next) => {
  upload.array("images", 10)(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 5 MB)."
        : err.message || "Upload failed.";
      return res.status(400).json({ error: msg });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image file provided (field name: 'images')." });
    }
    try {
      const alt = typeof req.body?.alt === "string" ? req.body.alt : req.product.name;
      const created = [];
      for (const f of req.files) {
        const url = `/uploads/products/${f.filename}`;
        created.push(await store.addProductImage(req.params.id, url, alt));
      }
      res.status(201).json(created);
    } catch (e) { next(e); }
  });
});

// DELETE /api/admin/products/:id/images/:imageId — delete image (admin)
router.delete("/:id/images/:imageId", requireAuth, ensureProduct, async (req, res, next) => {
  try {
    const removed = await store.deleteProductImage(req.params.id, req.params.imageId);
    if (!removed) return res.status(404).json({ error: "Image not found" });
    // Remove the file from disk (best effort; only within the uploads dir).
    if (removed.url && removed.url.startsWith("/uploads/products/")) {
      const file = path.join(UPLOAD_DIR, path.basename(removed.url));
      // path.basename strips any traversal; confirm it stays inside UPLOAD_DIR.
      if (path.dirname(file) === UPLOAD_DIR) {
        await fs.unlink(file).catch(() => {});
      }
    }
    res.status(204).end();
  } catch (err) { next(err); }
});

// PUT /api/admin/products/:id/images/reorder — reorder (admin)
// Body: { order: [imageId, ...] }
router.put("/:id/images/reorder", requireAuth, ensureProduct, async (req, res, next) => {
  try {
    const order = Array.isArray(req.body?.order) ? req.body.order : null;
    if (!order) return res.status(400).json({ error: "order must be an array of image ids" });
    await store.reorderImages(req.params.id, order);
    res.json(await store.getProductImages(req.params.id));
  } catch (err) { next(err); }
});

// PUT /api/admin/products/:id/images/:imageId/main — set primary (admin)
router.put("/:id/images/:imageId/main", requireAuth, ensureProduct, async (req, res, next) => {
  try {
    const ok = await store.setMainImage(req.params.id, req.params.imageId);
    if (!ok) return res.status(404).json({ error: "Image not found" });
    res.json(await store.getProductImages(req.params.id));
  } catch (err) { next(err); }
});

export default router;
