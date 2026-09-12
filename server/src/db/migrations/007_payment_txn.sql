-- ============================================================================
-- Migration 007 — Store the Midtrans transaction id on orders
-- Lets the admin cross-check a payment in the Midtrans dashboard.
-- ADDITIVE / idempotent.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_txn_id TEXT;
