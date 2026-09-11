// ---- Migration runner ----
// Applies schema.sql to the configured database. Idempotent.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✓ Schema applied");
}

// Run directly (node src/db/migrate.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
