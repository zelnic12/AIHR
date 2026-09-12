-- ============================================================================
-- Migration 011 — Purchase-verified reviews
-- Adds the reviewer's email (used server-side to verify a purchase and to
-- prevent duplicate reviews). The email is NEVER shown publicly.
-- ADDITIVE / idempotent.
-- ============================================================================

-- 1) Add the column (nullable first so we can backfill existing rows).
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS reviewer_email TEXT;

-- 2) Backfill any pre-existing reviews with a placeholder so NOT NULL holds.
--    (Legacy reviews predate purchase verification; they keep their content.)
UPDATE product_reviews
  SET reviewer_email = 'legacy+' || id || '@unknown.local'
  WHERE reviewer_email IS NULL;

-- 3) Enforce NOT NULL going forward.
ALTER TABLE product_reviews
  ALTER COLUMN reviewer_email SET NOT NULL;

-- 4) One review per email per product (case-insensitive on email).
--    Enables "edit existing review instead of duplicate" via upsert.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_reviews_product_email
  ON product_reviews (product_id, lower(reviewer_email));
