-- ============================================================================
-- Migration 010 — Fulfillment method (delivery vs self-pickup)
-- Existing orders default to 'delivery' (backward compatible).
-- ADDITIVE / idempotent.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT NOT NULL DEFAULT 'delivery'
    CHECK (fulfillment_method IN ('delivery', 'pickup'));
