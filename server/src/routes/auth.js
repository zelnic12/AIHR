// ---- Auth router: /api/auth ----
import { Router } from "express";
import bcrypt from "bcryptjs";
import * as store from "../store.js";
import { signToken, requireAuth } from "../auth.js";

const router = Router();

// POST /api/auth/login — exchange username/password for a JWT.
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ error: "username and password are required" });
    }

    const admin = await store.getAdminByUsername(username);
    // Compare against the stored hash. Use a constant-ish path to avoid leaking
    // whether the username exists.
    const ok = admin ? await bcrypt.compare(password, admin.password_hash) : false;
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(admin);
    res.json({
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me — return the current admin (validates the token).
router.get("/me", requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

export default router;
