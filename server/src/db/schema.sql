-- ============================================================================
-- VoltEdge — PostgreSQL schema
-- Tables: products, product_images, orders, order_items, customers
-- Safe to run repeatedly (idempotent): uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- ---- updated_at trigger helper ----
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- products
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL CHECK (char_length(name) >= 2),
  brand       TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL DEFAULT 'Uncategorized',
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  rating      NUMERIC(2,1)  NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  emoji       TEXT        NOT NULL DEFAULT '📦',
  stock       INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  description TEXT        NOT NULL DEFAULT '',
  specs       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products (brand);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- product_images
-- One product has many images. `position` orders them; the first (lowest) is
-- treated as primary.
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  alt         TEXT        NOT NULL DEFAULT '',
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product
  ON product_images (product_id, position);

-- ============================================================================
-- customers
-- Deduplicated by email (a repeat buyer reuses their row). Latest shipping
-- details are kept on the customer; a snapshot is also stored on each order.
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  phone       TEXT        NOT NULL DEFAULT '',
  address     TEXT        NOT NULL DEFAULT '',
  city        TEXT        NOT NULL DEFAULT '',
  postal      TEXT        NOT NULL DEFAULT '',
  country     TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- orders
-- The public order id (e.g. "VE-...") is the primary key. A shipping snapshot
-- is denormalized onto the order so historical orders are immutable even if the
-- customer later edits their profile. Monetary totals are stored as computed
-- server-side.
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT        PRIMARY KEY,
  customer_id   INTEGER     REFERENCES customers (id) ON DELETE SET NULL,
  -- shipping snapshot at time of order
  ship_name     TEXT        NOT NULL,
  ship_email    TEXT        NOT NULL,
  ship_phone    TEXT        NOT NULL,
  ship_address  TEXT        NOT NULL,
  ship_city     TEXT        NOT NULL,
  ship_postal   TEXT        NOT NULL,
  ship_country  TEXT        NOT NULL,
  -- amounts
  subtotal      NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping      NUMERIC(10,2) NOT NULL CHECK (shipping >= 0),
  tax           NUMERIC(10,2) NOT NULL CHECK (tax >= 0),
  total         NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders (created_at DESC);

-- ============================================================================
-- order_items
-- Line items for each order. Product name/price are snapshotted so the order
-- history is stable even if the product later changes or is deleted.
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      TEXT        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id    INTEGER     REFERENCES products (id) ON DELETE SET NULL,
  product_name  TEXT        NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER     NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);


-- ============================================================================
-- admin_users
-- Dashboard operators. Passwords are stored as bcrypt hashes only.
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  name          TEXT        NOT NULL DEFAULT '',
  role          TEXT        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
