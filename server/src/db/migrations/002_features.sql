-- ============================================================================
-- Migration 002 — Image management, promotional pricing, invoices
-- ADDITIVE ONLY. Safe to run repeatedly. No table drops, no data loss.
-- Existing products/orders keep working with backward-compatible defaults.
-- ============================================================================

-- ---- Promotional pricing --------------------------------------------------
-- `price` remains the regular/list price. `sale_price` is the optional
-- promotional price. A sale is active only when it is non-null and strictly
-- less than price. Discount % is always COMPUTED, never stored.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2)
  CHECK (sale_price IS NULL OR sale_price >= 0);

-- ---- Order item price snapshots -------------------------------------------
-- `unit_price` already snapshots the CHARGED price. Add the regular (list)
-- price snapshot so invoices can show a per-line discount.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS regular_price NUMERIC(10,2);

-- Backfill existing rows: no historical discount known → regular = charged.
UPDATE order_items SET regular_price = unit_price WHERE regular_price IS NULL;

-- ---- Invoice fields on orders ---------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_no    TEXT,
  ADD COLUMN IF NOT EXISTS discount      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  ADD COLUMN IF NOT EXISTS access_token  TEXT;

-- Invoice numbers must be unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_invoice_no ON orders (invoice_no) WHERE invoice_no IS NOT NULL;

-- Sequence backing the human-readable invoice number (server-authoritative).
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- ---- Store settings (single row) ------------------------------------------
-- Configurable seller info for invoices. Seeded with the store NAME only;
-- contact/tax/bank details are intentionally left blank (not invented) and can
-- be filled in later from the admin dashboard.
CREATE TABLE IF NOT EXISTS store_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
  name        TEXT        NOT NULL DEFAULT 'Sinar Elektronik',
  tagline     TEXT        NOT NULL DEFAULT '',
  address     TEXT        NOT NULL DEFAULT '',
  city        TEXT        NOT NULL DEFAULT '',
  postal      TEXT        NOT NULL DEFAULT '',
  country     TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  tax_id      TEXT        NOT NULL DEFAULT '',
  bank_info   TEXT        NOT NULL DEFAULT '',
  currency    TEXT        NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON store_settings;
CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ensure the singleton row exists (name only; other fields blank by default).
INSERT INTO store_settings (id, name)
  VALUES (1, 'Sinar Elektronik')
  ON CONFLICT (id) DO NOTHING;
