// ---- Admin user seed ----
// Creates (or updates) a default admin account. Idempotent via upsert on
// username. Credentials come from env with safe demo defaults:
//   ADMIN_USERNAME (default "admin")
//   ADMIN_PASSWORD (default "admin123")
//   ADMIN_NAME     (default "Store Admin")
import 'dotenv/config';
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import { pool } from "./pool.js";

export async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Store Admin";

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO admin_users (username, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
    [username, hash, name]
  );

  console.log(`✓ Admin user ready: "${username}"` +
    (process.env.ADMIN_PASSWORD ? "" : ` (default password "${password}" — change via ADMIN_PASSWORD)`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAdmin()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(err => { console.error("Admin seed failed:", err); process.exit(1); });
}
