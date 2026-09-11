// ---- Data store ----
// A JSON-file-backed persistence layer. All data access goes through this
// module so the storage engine can later be swapped for a real database
// (Postgres, Mongo, etc.) without touching the routers/controllers.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_PRODUCTS } from "./data/seed-products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// Initialise data files on first boot. Products are seeded from the catalog;
// orders start as an empty list.
export async function initStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readJson(PRODUCTS_FILE, null);
  if (!existing) await writeJson(PRODUCTS_FILE, SEED_PRODUCTS);
  const orders = await readJson(ORDERS_FILE, null);
  if (!orders) await writeJson(ORDERS_FILE, []);
}

// ---- Products ----
export async function getProducts() {
  return readJson(PRODUCTS_FILE, []);
}

export async function getProduct(id) {
  const products = await getProducts();
  return products.find(p => p.id === Number(id)) || null;
}

export async function createProduct(data) {
  const products = await getProducts();
  const nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const product = { id: nextId, ...data };
  products.push(product);
  await writeJson(PRODUCTS_FILE, products);
  return product;
}

export async function updateProduct(id, data) {
  const products = await getProducts();
  const idx = products.findIndex(p => p.id === Number(id));
  if (idx === -1) return null;
  // Preserve id; merge the rest.
  products[idx] = { ...products[idx], ...data, id: products[idx].id };
  await writeJson(PRODUCTS_FILE, products);
  return products[idx];
}

export async function deleteProduct(id) {
  const products = await getProducts();
  const idx = products.findIndex(p => p.id === Number(id));
  if (idx === -1) return false;
  products.splice(idx, 1);
  await writeJson(PRODUCTS_FILE, products);
  return true;
}

// Atomically decrement stock for a set of line items (used when an order is placed).
export async function decrementStock(items) {
  const products = await getProducts();
  for (const item of items) {
    const p = products.find(pr => pr.id === Number(item.id));
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  }
  await writeJson(PRODUCTS_FILE, products);
}

// ---- Orders ----
export async function getOrders() {
  return readJson(ORDERS_FILE, []);
}

export async function getOrder(id) {
  const orders = await getOrders();
  return orders.find(o => o.id === id) || null;
}

export async function createOrder(order) {
  const orders = await getOrders();
  orders.push(order);
  await writeJson(ORDERS_FILE, orders);
  return order;
}
