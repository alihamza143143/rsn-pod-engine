-- Migration 044: DM Conversations (Phase C of chat-fix-and-dm-system, 1 May 2026)
--
-- One row per pair of users that have ever exchanged a DM. The pair is
-- normalised by sorting (user_a_id < user_b_id) so we can rely on UNIQUE
-- to dedupe and so lookups are direction-independent.
--
-- Soft-delete is per-user via user_a_deleted_at / user_b_deleted_at. When
-- one side deletes, only their copy disappears; the other party's thread
-- continues. Sending a new message clears the deleter's timestamp (the
-- conversation reappears in their inbox).

BEGIN;

CREATE TABLE IF NOT EXISTS dm_conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at     TIMESTAMPTZ,
  user_a_deleted_at   TIMESTAMPTZ,
  user_b_deleted_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id),
  CHECK(user_a_id < user_b_id)
);

-- Inbox queries hit "my conversations sorted by recent activity"; both
-- indexes give the planner a fast path whichever side the user is on.
CREATE INDEX IF NOT EXISTS idx_dm_conv_user_a
  ON dm_conversations(user_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_dm_conv_user_b
  ON dm_conversations(user_b_id, last_message_at DESC NULLS LAST);

COMMIT;
