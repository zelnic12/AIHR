// ---- Migration runner ----
// Applies schema.sql to the configured database. Idempotent.
import 'dotenv/config';
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  // 1) Base schema (idempotent).
  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✓ Schema applied");

  // 2) Incremental migrations in migrations/ applied in filename order.
  //    Every migration is written to be idempotent (IF NOT EXISTS / defaults),
  //    so re-running is safe and never destroys existing data.
  const migrationsDir = path.join(__dirname, "migrations");
  let files = [];
  try {
    files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith(".sql")).sort();
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  for (const file of files) {
    const migSql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(migSql);
    console.log(`✓ Migration applied: ${file}`);
  }
}

// Run directly (node src/db/migrate.js)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
