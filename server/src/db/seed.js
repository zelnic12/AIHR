// ---- Seed script ----
// Loads the catalog into Postgres. Idempotent: clears product tables first,
// then inserts products and a placeholder image per product. Orders/customers
// are left untouched.
import 'dotenv/config';
import { pathToFileURL } from "node:url";
import { pool, withTransaction } from "./pool.js";
import { SEED_PRODUCTS } from "../data/seed-products.js";

export async function seed() {
  await withTransaction(async (client) => {
    // Reset product data (cascades to product_images). Restart identity so
    // seeded ids match the catalog ids.
    await client.query("TRUNCATE product_images, products RESTART IDENTITY CASCADE");

    // A few demo promotional prices so the discount UI is visible out of the box.
    // (Admins can change or clear these from the dashboard.)
    const DEMO_SALES = { 1: 1299.00, 4: 799.00, 8: 229.00 };

    for (const p of SEED_PRODUCTS) {
      const salePrice = p.salePrice ?? DEMO_SALES[p.id] ?? null;
      // Preserve the catalog id explicitly so frontend links stay stable.
      await client.query(
        `INSERT INTO products (id, name, brand, category, price, sale_price, rating, emoji, stock, description, specs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [p.id, p.name, p.brand, p.category, p.price, salePrice, p.rating, p.emoji, p.stock, p.description, JSON.stringify(p.specs)]
      );

      // A placeholder image row per product (emoji-based; swap for real URLs later).
      await client.query(
        `INSERT INTO product_images (product_id, url, alt, position)
         VALUES ($1,$2,$3,$4)`,
        [p.id, `emoji:${p.emoji}`, p.name, 0]
      );
    }

    // Keep the SERIAL sequence ahead of the seeded ids.
    await client.query(
      "SELECT setval(pg_get_serial_sequence('products','id'), (SELECT MAX(id) FROM products))"
    );
  });

  console.log(`✓ Seeded ${SEED_PRODUCTS.length} products (+ images)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
