-- Migration 055: Matching Engine 1.0 spec data model (2 May 2026)
--
-- Implements the data model required by the canonical Matching System
-- Specification v1 (assets/Matching algorithm 1.0.pdf):
--
-- - Section 4: User Profile.premium_flag, requested_users.
-- - Section 4: Session Assignment match_score, match_reason, fallback_flag,
--              repeat_flag (all already on `matches` except the metadata
--              fields we add below).
-- - Section 7: Premium matching — match_requests table for
--              "premium user X requests to meet user Y this event".
-- - Section 13: Logging — every match row records match_reason,
--               fallback_used, repeat_in_event, premium_influenced for
--               debugging + future learning.
--
-- This migration is additive: every column has a safe default and the
-- new table is empty until premium users start opting in. Existing
-- matches keep working unchanged.

BEGIN;

-- ── Section 4: User Profile premium flag ──────────────────────────────
-- Boolean rather than tier enum for v1 simplicity. Can promote to enum
-- in a later migration when paid tiers differentiate (gold/platinum/etc).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_premium
  ON users(is_premium) WHERE is_premium = TRUE;

-- ── Section 7: Premium match requests ────────────────────────────────
-- One row per (requester, requested, event). Status governs lifecycle:
--   pending   = engine should try to honour this request in the upcoming
--               schedule
--   fulfilled = the pair was scheduled / met during the event
--   expired   = event ended without honouring (engine couldn't fit it)
-- "request specific people" (Section 7) maps directly to inserts here.
-- "requested matches occur at most once per event" (Section 7) is enforced
-- by the UNIQUE constraint plus engine bookkeeping.
CREATE TABLE IF NOT EXISTS match_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'fulfilled', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at  TIMESTAMPTZ,
  CHECK (requester_id != requested_id),
  UNIQUE(requester_id, requested_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_match_requests_event_status
  ON match_requests(event_id, status);
CREATE INDEX IF NOT EXISTS idx_match_requests_requester
  ON match_requests(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_match_requests_requested
  ON match_requests(requested_id, status);

-- ── Section 13: Match logging metadata ───────────────────────────────
-- Pre-Phase-this, matches stored only score + reason_tags (a string[]).
-- The spec wants explicit boolean flags for debugging and future
-- learning loops:
--   match_reason       = a human-readable string (best single tag)
--   fallback_used      = engine had to relax the no-repeat rule
--   repeat_in_event    = pair has met before THIS event
--   premium_influenced = at least one side was premium AND the score
--                        boost or request alignment changed who was paired
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_reason TEXT;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS repeat_in_event BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS premium_influenced BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for admin queries: "show me all fallback / premium matches"
CREATE INDEX IF NOT EXISTS idx_matches_fallback
  ON matches(session_id, fallback_used) WHERE fallback_used = TRUE;
CREATE INDEX IF NOT EXISTS idx_matches_premium
  ON matches(session_id, premium_influenced) WHERE premium_influenced = TRUE;

COMMIT;
