-- Migration 041: Relax match-uniqueness indexes to only block ACTIVE matches.
--
-- Migration 038 made these partial with WHERE status NOT IN ('cancelled','no_show'),
-- which still blocks new matches when a 'completed' match exists for the same
-- (session, round, participant) tuple. That broke the host-creates-manual-room
-- flow after an algorithm round ended — completed Round 1 match kept Ali's slot
-- occupied, host could not put him in a manual room.
--
-- Correct rule: a user can only be in ONE active match at a time per round.
-- Completed/cancelled/no_show/reassigned matches are HISTORY and don't block.
--
-- This works for both algorithm rounds (status='active' during round, then
-- 'completed') and manual rooms (status='active' while running, then 'completed').

BEGIN;

DROP INDEX IF EXISTS unique_match_per_round;
DROP INDEX IF EXISTS idx_unique_participant_b_per_round;
DROP INDEX IF EXISTS idx_unique_participant_c_per_round;

CREATE UNIQUE INDEX unique_match_per_round
  ON matches (session_id, round_number, participant_a_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_unique_participant_b_per_round
  ON matches (session_id, round_number, participant_b_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX idx_unique_participant_c_per_round
  ON matches (session_id, round_number, participant_c_id)
  WHERE participant_c_id IS NOT NULL AND status = 'active';

COMMIT;
