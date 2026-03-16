-- ─── Migration 020: Violations & Moderation ─────────────────────────────────
-- Foundation for the moderation queue: users can report others, admins review.

BEGIN;

CREATE TYPE violation_status AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE IF NOT EXISTS violations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  details          TEXT,
  status           violation_status NOT NULL DEFAULT 'open',
  admin_notes      TEXT,
  resolved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_reported ON violations(reported_user_id);

-- Email configuration table for admin toggle controls
CREATE TABLE IF NOT EXISTS email_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type  VARCHAR(100) NOT NULL UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  subject     TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default email types
INSERT INTO email_config (email_type, enabled, subject) VALUES
  ('magic_link', TRUE, 'Your RSN login link'),
  ('invite_pod', TRUE, 'You''ve been invited to a pod'),
  ('invite_session', TRUE, 'You''re invited to an event'),
  ('invite_platform', TRUE, 'You''re invited to RSN'),
  ('recap', TRUE, 'Your event recap is ready'),
  ('join_request_approved', TRUE, 'Your request to join RSN has been approved'),
  ('join_request_declined', TRUE, 'Update on your RSN join request')
ON CONFLICT (email_type) DO NOTHING;

COMMIT;
