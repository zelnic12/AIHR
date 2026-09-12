-- ============================================================================
-- Migration 003 — Order status flow
-- Old: pending | paid | shipped | cancelled
-- New: needs_shipping | shipped | completed | cancelled
--
-- Sequential stages: needs_shipping → shipped → completed (+ cancelled).
-- ADDITIVE/NON-DESTRUCTIVE to rows: existing orders are REMAPPED, never deleted.
-- Idempotent: safe to run repeatedly.
--
-- Mapping:
--   pending  → needs_shipping   (placed, awaiting processing/shipment)
--   paid     → needs_shipping   (checkout sets this; awaiting shipment)
--   shipped  → shipped          (unchanged)
--   cancelled→ cancelled        (unchanged)
--   (no legacy 'completed'; nothing maps to it initially)
-- ============================================================================

-- 1) Drop the existing CHECK constraint so we can remap values freely.
--    Postgres auto-names an inline column CHECK as "<table>_<column>_check".
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2) Neutralize the old default before remapping (avoids default referencing an
--    about-to-be-invalid literal on some setups).
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- 3) Remap existing data. Only touches legacy values; already-migrated rows
--    (needs_shipping/completed) and shipped/cancelled are left as-is.
UPDATE orders SET status = 'needs_shipping' WHERE status IN ('pending', 'paid');

-- 4) Set the new default.
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'needs_shipping';

-- 5) Re-add the CHECK with the new allowed set.
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('needs_shipping', 'shipped', 'completed', 'cancelled'));
