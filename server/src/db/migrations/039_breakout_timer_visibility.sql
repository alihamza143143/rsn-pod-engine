-- Migration 039: Add timer_visibility column to matches table
--
-- Bulk manual breakout rooms can be created with either visible or hidden
-- timer for participants. Default 'visible' preserves existing behavior.

BEGIN;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS timer_visibility VARCHAR(10) NOT NULL DEFAULT 'visible';

-- Sanity check: only 'visible' or 'hidden' allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'matches_timer_visibility_check'
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT matches_timer_visibility_check
      CHECK (timer_visibility IN ('visible', 'hidden'));
  END IF;
END $$;

COMMENT ON COLUMN matches.timer_visibility IS 'Breakout room timer visibility to participants: visible or hidden';

COMMIT;
