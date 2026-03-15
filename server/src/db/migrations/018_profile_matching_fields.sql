-- ─── Migration 018: Profile Matching Fields ──────────────────────────────────
-- Adds structured matching signal fields to the users table.
-- These fields capture what users care about, what they offer, and who they
-- want to meet — essential for future AI-based classification and matching.
--
-- Also adds a free-text expertise field alongside the existing interests[] tags,
-- and an invite_opt_out_public_events preference for Phase 5.

BEGIN;

-- Matching signal fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS expertise_text         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS what_i_care_about      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS what_i_can_help_with   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS who_i_want_to_meet     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS why_i_want_to_meet     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS my_intent              TEXT;

-- Invite opt-out preference (Phase 5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_opt_out_public_events BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
