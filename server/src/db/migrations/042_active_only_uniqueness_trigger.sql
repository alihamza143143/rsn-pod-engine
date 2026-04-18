-- Migration 042: Align match-uniqueness TRIGGER with the active-only partial index from 041.
--
-- Migration 029 created a TRIGGER (`trg_check_participant_uniqueness`) whose
-- function still uses `status NOT IN ('cancelled', 'no_show')` to detect
-- conflicts. Migration 041 already relaxed the partial INDEX to `status =
-- 'active'`, but the trigger was never updated.
--
-- Live consequence (2026-04-18):
--   1. Round 1 active. Algorithm matches running.
--   2. Host clicks "Bulk" / "Room" with participants who are in active matches.
--   3. The bulk-create handler reassigns each participant's existing active
--      match (status='active' → 'reassigned') so the new manual room can take
--      ownership of those participants.
--   4. The handler then INSERTs the new manual match.
--   5. The trigger fires and finds the just-reassigned match (status='reassigned',
--      which is NOT in ('cancelled','no_show')) — incorrectly raises
--      PARTICIPANT_ALREADY_MATCHED.
--   6. The new manual match is rejected; the algorithm match is already gone.
--   7. The host's dashboard refreshes and shows the empty state — "ghost wipe".
--
-- Architectural rule (post-040/041): "manual breakouts and algorithm rounds
-- are fully independent". A user can only be in ONE ACTIVE match at a time
-- per round. Reassigned/completed/cancelled/no_show matches are HISTORY and
-- must never block new INSERTs.
--
-- This migration recreates the trigger function so its conflict predicate
-- is `m.status = 'active'` — matching the partial index. The trigger itself
-- is dropped + recreated so existing instances pick up the new function body.

BEGIN;

CREATE OR REPLACE FUNCTION check_participant_uniqueness_per_round()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Only ACTIVE matches block new inserts. A 'completed', 'reassigned',
  -- 'cancelled', or 'no_show' row is history and must not occupy the slot.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO conflict_count
  FROM matches m
  WHERE m.session_id = NEW.session_id
    AND m.round_number = NEW.round_number
    AND m.id <> NEW.id
    AND m.status = 'active'
    AND (
      NEW.participant_a_id IN (m.participant_a_id, m.participant_b_id, m.participant_c_id)
      OR NEW.participant_b_id IN (m.participant_a_id, m.participant_b_id, m.participant_c_id)
      OR (NEW.participant_c_id IS NOT NULL AND NEW.participant_c_id IN (m.participant_a_id, m.participant_b_id, m.participant_c_id))
    );

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'PARTICIPANT_ALREADY_MATCHED: One or more participants are already in an active match for session % round %',
      NEW.session_id, NEW.round_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop+recreate the BEFORE INSERT trigger so it picks up the new function body.
DROP TRIGGER IF EXISTS trg_check_participant_uniqueness ON matches;
CREATE TRIGGER trg_check_participant_uniqueness
  BEFORE INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION check_participant_uniqueness_per_round();

-- Drop+recreate the BEFORE UPDATE trigger. It only fires when transitioning
-- FROM a "history" status TO active (e.g. accidentally setting a cancelled
-- row back to active). With the new function body the conflict check uses
-- the same active-only predicate.
DROP TRIGGER IF EXISTS trg_check_participant_uniqueness_update ON matches;
CREATE TRIGGER trg_check_participant_uniqueness_update
  BEFORE UPDATE ON matches
  FOR EACH ROW
  WHEN (OLD.status <> 'active' AND NEW.status = 'active')
  EXECUTE FUNCTION check_participant_uniqueness_per_round();

COMMIT;
