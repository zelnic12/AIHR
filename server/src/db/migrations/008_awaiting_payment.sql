-- ============================================================================
-- Migration 008 — 'awaiting_payment' fulfilment status
-- Orders that require an online payment start here and only enter the
-- 'needs_shipping' pipeline once the payment settles (via the Midtrans webhook).
-- ADDITIVE / idempotent.
-- ============================================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('awaiting_payment', 'needs_shipping', 'shipped', 'completed', 'cancelled'));
