-- ============================================================================
-- Migration 005 — Live chat (customer ↔ admin)
-- Customers are identified by a random session_token (no login). Admins reply
-- via the JWT-protected admin API. Idempotent, additive.
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id              SERIAL PRIMARY KEY,
  customer_name   TEXT        NOT NULL,
  customer_email  TEXT        NOT NULL,
  session_token   TEXT        NOT NULL UNIQUE,   -- opaque token held by the customer's browser
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- unread counters for a simple "new messages" indicator
  admin_unread    INTEGER     NOT NULL DEFAULT 0,   -- messages from customer the admin hasn't seen
  customer_unread INTEGER     NOT NULL DEFAULT 0    -- replies from admin the customer hasn't seen
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_last_msg ON chat_conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER     NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  sender          TEXT        NOT NULL CHECK (sender IN ('customer', 'admin')),
  body            TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages (conversation_id, id);
