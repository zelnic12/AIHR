// ---- PostgreSQL connection pool ----
// Reads connection config from the environment. Either provide a single
// DATABASE_URL, or the discrete PG* variables below.
//
//   DATABASE_URL=postgres://user:pass@host:5432/dbname
// or
//   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
//
// A single shared pool is exported and reused across the app.

import pg from "pg";

const { Pool } = pg;

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    };
  }
  return {
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "voltedge",
  };
}

export const pool = new Pool(buildConfig());

pool.on("error", err => {
  console.error("Unexpected error on idle Postgres client:", err);
});

// Convenience query helper.
export function query(text, params) {
  return pool.query(text, params);
}

// Run a function inside a transaction, auto commit/rollback.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
