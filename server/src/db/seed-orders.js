// ---- Demo orders seed ----
// Generates realistic orders spread over the last ~60 days so the admin
// dashboard analytics (revenue, best-sellers, category/brand splits, and the
// daily/weekly/monthly charts) have meaningful data to display.
//
// Idempotent-ish: clears existing orders/customers first, then inserts a fresh
// randomized set. Does NOT change product stock (kept simple for demo data).

import { pool, withTransaction } from "./pool.js";

const CONFIG = { SHIPPING_FEE: 9.99, FREE_SHIPPING_THRESHOLD: 100, TAX_RATE: 0.08 };
const round2 = n => Math.round(n * 100) / 100;

const NAMES = [
  "Jane Doe", "Sam Buyer", "Alex Kim", "Maria Lopez", "Chen Wei", "Omar Farouk",
  "Priya Patel", "Liam Murphy", "Nina Rossi", "Tom Becker", "Yuki Tanaka", "Grace Okafor",
];
const COUNTRIES = ["USA", "UK", "Germany", "Japan", "Canada", "France"];

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rand(0, arr.length - 1)];

function orderId(d) {
  return "VE-" + d.getTime().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function seedOrders(count = 120) {
  const { rows: products } = await pool.query("SELECT id, name, brand, price FROM products");
  if (products.length === 0) throw new Error("No products found — run the product seed first.");

  await withTransaction(async (client) => {
    await client.query("TRUNCATE order_items, orders, customers RESTART IDENTITY CASCADE");

    for (let i = 0; i < count; i++) {
      // Random date within the last 60 days (weighted slightly toward recent).
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 60);
      const created = new Date();
      created.setDate(created.getDate() - daysAgo);
      created.setHours(rand(8, 21), rand(0, 59), rand(0, 59), 0);

      // 1–4 distinct line items.
      const nItems = rand(1, 4);
      const chosen = new Map();
      for (let k = 0; k < nItems; k++) {
        const p = pick(products);
        chosen.set(p.id, { product: p, qty: (chosen.get(p.id)?.qty || 0) + rand(1, 3) });
      }
      const items = [...chosen.values()];

      const subtotal = round2(items.reduce((s, it) => s + Number(it.product.price) * it.qty, 0));
      const shipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
      const tax = round2(subtotal * CONFIG.TAX_RATE);
      const total = round2(subtotal + shipping + tax);

      const name = pick(NAMES);
      const email = name.toLowerCase().replace(/[^a-z]/g, ".") + "@example.com";
      const country = pick(COUNTRIES);

      const { rows: cust } = await client.query(
        `INSERT INTO customers (name, email, phone, address, city, postal, country)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, email, `555-${rand(100, 999)}-${rand(1000, 9999)}`, `${rand(1, 999)} Demo St`, "Demo City", String(rand(10000, 99999)), country]
      );
      const customerId = cust[0].id;

      const id = orderId(created);
      const status = pick(["paid", "paid", "paid", "shipped", "pending", "cancelled"]);

      await client.query(
        `INSERT INTO orders
           (id, customer_id, ship_name, ship_email, ship_phone, ship_address,
            ship_city, ship_postal, ship_country, subtotal, shipping, tax, total, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [id, customerId, name, email, "555-000-0000", "Demo St", "Demo City", "00000", country,
         subtotal, shipping, tax, total, status, created.toISOString()]
      );

      for (const it of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, it.product.id, it.product.name, it.product.price, it.qty]
        );
      }
    }
  });

  console.log(`✓ Seeded ${count} demo orders over the last 60 days`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const count = Number(process.argv[2]) || 120;
  seedOrders(count)
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(err => { console.error("Order seed failed:", err); process.exit(1); });
}
