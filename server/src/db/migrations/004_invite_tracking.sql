-- ─── Migration: 004_invite_tracking ──────────────────────────────────────────
-- Track who invited whom for building the network graph.
-- Also add phone/whatsapp field to users.

ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

CREATE INDEX idx_users_invited_by ON users(invited_by_user_id);
