-- Migration 049: User Reports (Phase H of chat-fix-and-dm-system, 1 May 2026)
--
-- Stefan's spec: "people should be able to report people". Reports go into
-- a moderation queue admins review. Distinct from blocks (silent, per-user).
--
-- Reasons enum: spam, harassment, inappropriate_content, fake_profile,
-- safety, other. Status flow: open → resolved | dismissed.

BEGIN;

CREATE TABLE IF NOT EXISTS user_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CHECK (reason IN (
                  'spam', 'harassment', 'inappropriate_content',
                  'fake_profile', 'safety', 'other'
                )),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(reporter_id != reported_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status_created
  ON user_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported
  ON user_reports(reported_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter
  ON user_reports(reporter_id, created_at DESC);

COMMIT;
