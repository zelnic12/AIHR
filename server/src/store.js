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


// ---- Order status update ----
export async function updateOrderStatus(id, status) {
  const { rows } = await query(
    "UPDATE orders SET status = $1 WHERE id = $2 RETURNING id",
    [status, id]
  );
  if (rows.length === 0) return null;
  return getOrder(id);
}

// ============================================================================
// Analytics — aggregate queries for the admin dashboard.
// All monetary values are coerced from NUMERIC strings to numbers.
// ============================================================================

// Headline KPIs: revenue, order count, AOV, customers, units sold, catalog size.
export async function getSummary() {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(o.total), 0)          AS revenue,
      COUNT(DISTINCT o.id)               AS orders,
      COALESCE(SUM(o.subtotal), 0)       AS subtotal,
      COALESCE(SUM(o.tax), 0)            AS tax,
      COALESCE(SUM(o.shipping), 0)       AS shipping,
      COUNT(DISTINCT o.customer_id)      AS customers
    FROM orders o
  `);
  const units = await query("SELECT COALESCE(SUM(quantity),0) AS units FROM order_items");
  const products = await query("SELECT COUNT(*) AS n FROM products");
  const r = rows[0];
  const orders = Number(r.orders);
  const revenue = Number(r.revenue);
  return {
    revenue,
    orders,
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    shipping: Number(r.shipping),
    customers: Number(r.customers),
    unitsSold: Number(units.rows[0].units),
    productCount: Number(products.rows[0].n),
    avgOrderValue: orders > 0 ? +(revenue / orders).toFixed(2) : 0,
  };
}

// Best-selling products by units sold (and revenue).
export async function getBestSellers(limit = 5) {
  const { rows } = await query(`
    SELECT oi.product_id AS id,
           oi.product_name AS name,
           SUM(oi.quantity) AS units,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    GROUP BY oi.product_id, oi.product_name
    ORDER BY units DESC, revenue DESC
    LIMIT $1
  `, [limit]);
  return rows.map(r => ({
    id: r.id, name: r.name,
    units: Number(r.units), revenue: Number(r.revenue),
  }));
}

// Sales grouped by product category (joined via products; falls back to
// 'Unknown' for items whose product was later deleted).
export async function getSalesByCategory() {
  const { rows } = await query(`
    SELECT COALESCE(p.category, 'Unknown') AS label,
           SUM(oi.quantity) AS units,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY COALESCE(p.category, 'Unknown')
    ORDER BY revenue DESC
  `);
  return rows.map(r => ({ label: r.label, units: Number(r.units), revenue: Number(r.revenue) }));
}

// Sales grouped by product brand.
export async function getSalesByBrand() {
  const { rows } = await query(`
    SELECT COALESCE(NULLIF(p.brand, ''), 'Unknown') AS label,
           SUM(oi.quantity) AS units,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY COALESCE(NULLIF(p.brand, ''), 'Unknown')
    ORDER BY revenue DESC
  `);
  return rows.map(r => ({ label: r.label, units: Number(r.units), revenue: Number(r.revenue) }));
}

// Revenue/orders time series, bucketed by day | week | month.
// Returns a dense series (zero-filled gaps) for the last N buckets.
export async function getSalesTimeSeries(bucket = "day", points = 30) {
  const trunc = { day: "day", week: "week", month: "month" }[bucket] || "day";
  const stepInterval = { day: "1 day", week: "1 week", month: "1 month" }[trunc];

  // Generate a dense date spine then LEFT JOIN aggregated orders onto it.
  const { rows } = await query(`
    WITH spine AS (
      SELECT generate_series(
        date_trunc($1, now()) - ($2::int - 1) * $3::interval,
        date_trunc($1, now()),
        $3::interval
      ) AS bucket
    ),
    agg AS (
      SELECT date_trunc($1, created_at) AS bucket,
             SUM(total) AS revenue,
             COUNT(*)   AS orders
      FROM orders
      GROUP BY 1
    )
    SELECT s.bucket,
           COALESCE(a.revenue, 0) AS revenue,
           COALESCE(a.orders, 0)  AS orders
    FROM spine s
    LEFT JOIN agg a ON a.bucket = s.bucket
    ORDER BY s.bucket
  `, [trunc, points, stepInterval]);

  return rows.map(r => ({
    bucket: r.bucket instanceof Date ? r.bucket.toISOString() : r.bucket,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

// Products at or below a low-stock threshold (for stock management alerts).
export async function getLowStock(threshold = 5) {
  const { rows } = await query(
    "SELECT id, name, brand, category, stock, price FROM products WHERE stock <= $1 ORDER BY stock ASC, name",
    [threshold]
  );
  return rows.map(r => ({
    id: r.id, name: r.name, brand: r.brand, category: r.category,
    stock: r.stock, price: Number(r.price),
  }));
}
