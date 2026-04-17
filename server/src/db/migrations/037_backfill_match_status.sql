-- Migration 037: Backfill match status for historical no_show matches with ratings
--
-- The voluntary-leave bug (fixed in code, Tasks 3/4/5/6) was marking real
-- conversations as no_show. Any match with ratings submitted from both
-- participants proves a real conversation happened — flip those to completed.
--
-- This is a one-off data repair. The code fix prevents new rows from
-- being written incorrectly going forward.
--
-- Backfill criteria:
--   1. match.status = 'no_show'
--   2. At least one rating exists in ratings table for this match_id
--
-- After backfill, also clear session_participants.is_no_show for users
-- whose ONLY no_show match was just backfilled (don't clear flags for
-- users who still have genuine no_show matches in the same session).

BEGIN;

-- Flip matches with submitted ratings from no_show → completed
UPDATE matches
SET status = 'completed'
WHERE status = 'no_show'
  AND id IN (SELECT DISTINCT match_id FROM ratings);

-- Clear participant no_show flags for users whose no_show matches all got backfilled
UPDATE session_participants sp
SET is_no_show = FALSE
WHERE is_no_show = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM matches m
    WHERE m.session_id = sp.session_id
      AND m.status = 'no_show'
      AND (m.participant_a_id = sp.user_id OR m.participant_b_id = sp.user_id OR m.participant_c_id = sp.user_id)
  );

COMMIT;
