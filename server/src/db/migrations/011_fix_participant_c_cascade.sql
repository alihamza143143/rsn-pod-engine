-- Migration 011: Fix participant_c_id foreign key to include ON DELETE CASCADE
-- Migration 010 added participant_c_id without CASCADE, which would block user deletion.

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_participant_c_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_participant_c_id_fkey
  FOREIGN KEY (participant_c_id) REFERENCES users(id) ON DELETE CASCADE;
