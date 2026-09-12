-- ============================================================================
-- Migration 004 — Default store currency to Indonesian Rupiah (IDR)
-- Display/formatting only. Product prices remain raw numbers (unchanged).
-- Idempotent.
-- ============================================================================

-- New installs default to IDR.
ALTER TABLE store_settings ALTER COLUMN currency SET DEFAULT 'IDR';

-- Existing singleton row: switch to IDR only if it's still the old USD default
-- (don't clobber an intentionally-set currency).
UPDATE store_settings SET currency = 'IDR' WHERE id = 1 AND currency = 'USD';
