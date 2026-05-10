-- Migration 059: Host Visibility Modes (10 May 2026 review item 11)
--
-- Stefan #11: hosts and co-hosts need to choose how they appear in the
-- live event. Four modes:
--   • big_speaker  — pinned as the big tile in the lobby/breakout grid
--   • normal       — regular participant tile (default)
--   • producer     — not visible in any video tile (off-camera operator)
--   • hidden       — not rendered anywhere (off-stage organiser)
--
-- This migration is purely additive: a new enum + a NOT NULL column on
-- session_cohosts and sessions, both DEFAULT 'normal'. Existing data is
-- untouched and behavior unchanged unless a host explicitly sets a mode.
-- Safe to run on a live DB.

BEGIN;

CREATE TYPE host_visibility_mode AS ENUM ('big_speaker', 'normal', 'producer', 'hidden');

ALTER TABLE session_cohosts
  ADD COLUMN visibility_mode host_visibility_mode NOT NULL DEFAULT 'normal';

ALTER TABLE sessions
  ADD COLUMN host_visibility_mode host_visibility_mode NOT NULL DEFAULT 'normal';

COMMIT;
