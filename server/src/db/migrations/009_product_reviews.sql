-- ============================================================================
-- Migration 009 — Product reviews
-- Public reviews (no account required): name + 1–5 rating + short comment.
-- ADDITIVE / idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  reviewer_name TEXT        NOT NULL CHECK (char_length(reviewer_name) BETWEEN 1 AND 80),
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT        NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews (product_id, created_at DESC);
