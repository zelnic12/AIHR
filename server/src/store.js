// ---- Data store (PostgreSQL) ----
// All data access goes through this module. It talks to Postgres via the shared
// pool and returns objects in the same shape the API/frontend already expect,
// so the routers are unchanged by the migration from JSON files.

import { query, withTransaction } from "./db/pool.js";
import { migrate } from "./db/migrate.js";

// Convert a DB product row into the API product shape.
// NUMERIC columns come back as strings from pg — coerce to numbers.
function mapProduct(row) {
  if (!row) return null;
  const product = {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: Number(row.price),
    rating: Number(row.rating),
    emoji: row.emoji,
    stock: row.stock,
    description: row.description,
    specs: row.specs || {},
  };
  if (row.images) {
    product.images = row.images.map(img => ({ url: img.url, alt: img.alt }));
  }
  return product;
}

// On boot, ensure the schema exists. (Seeding is a separate explicit step.)
export async function initStore() {
  await migrate();
}

// ---- Products ----
const PRODUCT_SELECT = `
  SELECT p.*,
         COALESCE(
           (SELECT json_agg(json_build_object('url', pi.url, 'alt', pi.alt) ORDER BY pi.position, pi.id)
              FROM product_images pi WHERE pi.product_id = p.id),
           '[]'::json
         ) AS images
    FROM products p`;

export async function getProducts() {
  const { rows } = await query(`${PRODUCT_SELECT} ORDER BY p.id`);
  return rows.map(mapProduct);
}

export async function getProduct(id) {
  const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [Number(id)]);
  return mapProduct(rows[0]);
}

export async function createProduct(data) {
  const { rows } = await query(
    `INSERT INTO products (name, brand, category, price, rating, emoji, stock, description, specs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.name, data.brand ?? "", data.category ?? "Uncategorized",
      data.price, data.rating ?? 0, data.emoji ?? "📦",
      data.stock, data.description ?? "", JSON.stringify(data.specs ?? {}),
    ]
  );
  return mapProduct(rows[0]);
}

export async function updateProduct(id, data) {
  // Build a dynamic SET clause from the provided fields only.
  const fields = ["name", "brand", "category", "price", "rating", "emoji", "stock", "description", "specs"];
  const sets = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = $${i++}`);
      values.push(f === "specs" ? JSON.stringify(data[f]) : data[f]);
    }
  }
  if (sets.length === 0) return getProduct(id); // nothing to update
  values.push(Number(id));
  const { rows } = await query(
    `UPDATE products SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return mapProduct(rows[0]);
}

export async function deleteProduct(id) {
  const { rowCount } = await query("DELETE FROM products WHERE id = $1", [Number(id)]);
  return rowCount > 0;
}

// ---- Orders ----
// Convert order + item rows into the API order shape.
function mapOrder(orderRow, itemRows) {
  return {
    id: orderRow.id,
    createdAt: orderRow.created_at instanceof Date ? orderRow.created_at.toISOString() : orderRow.created_at,
    customer: {
      name: orderRow.ship_name,
      email: orderRow.ship_email,
      phone: orderRow.ship_phone,
      address: orderRow.ship_address,
      city: orderRow.ship_city,
      postal: orderRow.ship_postal,
      country: orderRow.ship_country,
    },
    items: itemRows.map(it => ({
      id: it.product_id,
      name: it.product_name,
      price: Number(it.unit_price),
      qty: it.quantity,
    })),
    amounts: {
      subtotal: Number(orderRow.subtotal),
      shipping: Number(orderRow.shipping),
      tax: Number(orderRow.tax),
      total: Number(orderRow.total),
    },
    status: orderRow.status,
  };
}

export async function getOrders() {
  const { rows: orders } = await query("SELECT * FROM orders ORDER BY created_at DESC");
  if (orders.length === 0) return [];
  const ids = orders.map(o => o.id);
  const { rows: items } = await query(
    "SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id", [ids]
  );
  const byOrder = new Map(orders.map(o => [o.id, []]));
  for (const it of items) byOrder.get(it.order_id)?.push(it);
  return orders.map(o => mapOrder(o, byOrder.get(o.id)));
}

export async function getOrder(id) {
  const { rows: orders } = await query("SELECT * FROM orders WHERE id = $1", [id]);
  if (orders.length === 0) return null;
  const { rows: items } = await query(
    "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [id]
  );
  return mapOrder(orders[0], items);
}

// Create an order atomically: upsert customer, insert order + items, decrement
// stock — all in one transaction.
export async function createOrder(order) {
  return withTransaction(async (client) => {
    const c = order.customer;

    // Upsert the customer by email; keep their latest details.
    const { rows: custRows } = await client.query(
      `INSERT INTO customers (name, email, phone, address, city, postal, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address,
         city = EXCLUDED.city, postal = EXCLUDED.postal, country = EXCLUDED.country
       RETURNING id`,
      [c.name, c.email, c.phone, c.address, c.city, c.postal, c.country]
    );
    const customerId = custRows[0].id;

    // Insert the order (with shipping snapshot + amounts).
    await client.query(
      `INSERT INTO orders
         (id, customer_id, ship_name, ship_email, ship_phone, ship_address,
          ship_city, ship_postal, ship_country, subtotal, shipping, tax, total, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        order.id, customerId, c.name, c.email, c.phone, c.address,
        c.city, c.postal, c.country,
        order.amounts.subtotal, order.amounts.shipping, order.amounts.tax, order.amounts.total,
        order.status, order.createdAt,
      ]
    );

    // Insert line items and decrement stock.
    for (const item of order.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.id, item.name, item.price, item.qty]
      );
      await client.query(
        "UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2",
        [item.qty, item.id]
      );
    }

    return order;
  });
}
