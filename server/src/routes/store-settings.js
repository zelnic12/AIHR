// ---- Store settings: /api/store-settings ----
// GET is public (invoice header / storefront footer may use the store name).
// PUT is admin-only.
import { Router } from "express";
import * as store from "../store.js";
import { requireAuth } from "../auth.js";

const router = Router();

// GET /api/store-settings — public store info (name, address, etc.)
router.get("/", async (req, res, next) => {
  try {
    res.json(await store.getStoreSettings());
  } catch (err) { next(err); }
});

// PUT /api/store-settings — update (admin only)
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    // Only string fields are accepted; anything else is ignored by the store layer.
    const updated = await store.updateStoreSettings(body);
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
