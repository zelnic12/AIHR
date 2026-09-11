// ---- Auth utilities & middleware ----
// JWT-based admin authentication. The signing secret comes from JWT_SECRET;
// a dev fallback is used if unset (warned at boot, do NOT rely on it in prod).
import jwt from "jsonwebtoken";
import * as store from "./store.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = process.env.JWT_TTL || "8h";

if (!process.env.JWT_SECRET) {
  console.warn("⚠  JWT_SECRET is not set — using an insecure dev fallback. Set JWT_SECRET in production.");
}

// Sign a token for an authenticated admin.
export function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, username: admin.username, role: admin.role || "admin" },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws on invalid/expired
}

// Extract a Bearer token from the Authorization header.
function bearer(req) {
  const h = req.headers.authorization || "";
  const [scheme, token] = h.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

// Express middleware: reject unless a valid admin token is present.
// Attaches the resolved admin to req.admin.
export async function requireAuth(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const payload = verifyToken(token);
    // Confirm the account still exists.
    const admin = await store.getAdminById(payload.sub);
    if (!admin) return res.status(401).json({ error: "Invalid session" });

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired" });
    }
    return res.status(401).json({ error: "Invalid or missing token" });
  }
}
