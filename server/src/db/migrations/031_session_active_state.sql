-- Migration 031: Add active_state column for session state persistence
-- Allows server to recover active sessions after restart

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_state JSONB;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_state_updated_at TIMESTAMPTZ;

-- Index for finding active sessions on startup
CREATE INDEX IF NOT EXISTS idx_sessions_active_state ON sessions (status)
  WHERE status IN ('lobby_open', 'round_active', 'round_rating', 'round_transition', 'closing_lobby');
