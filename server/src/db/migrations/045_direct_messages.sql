-- Migration 045: Direct Messages (Phase C of chat-fix-and-dm-system, 1 May 2026)
--
-- One row per DM. read_at is NULL until the recipient marks it read.
-- The from_user_id is one of the conversation's two users — the recipient
-- is implicit (the other one). We don't store to_user_id because it would
-- be denormalised; the conversation row pins the pair.

BEGIN;

CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 4000),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thread view: messages in a conversation, newest first.
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv
  ON direct_messages(conversation_id, created_at DESC);

-- Unread badge query: count where read_at IS NULL for this conversation
-- and from_user_id != current user. Partial index keeps it tight.
CREATE INDEX IF NOT EXISTS idx_dm_messages_unread
  ON direct_messages(conversation_id, from_user_id)
  WHERE read_at IS NULL;

COMMIT;
