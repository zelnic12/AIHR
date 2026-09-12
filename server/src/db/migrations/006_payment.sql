-- ============================================================================
-- Migration 006 — Midtrans payment fields on orders
-- Stores the Snap token + payment status returned by the gateway.
-- ADDITIVE / idempotent. Existing orders default to payment_status 'pending'.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_token        TEXT,
  ADD COLUMN IF NOT EXISTS payment_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'unconfigured'));
