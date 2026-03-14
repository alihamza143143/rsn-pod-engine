-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 013: Add user notification & privacy preferences
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notify_email        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_event_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_matches       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_visible      BOOLEAN NOT NULL DEFAULT TRUE;
