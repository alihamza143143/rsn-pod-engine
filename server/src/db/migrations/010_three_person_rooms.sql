-- Migration 010: Add support for 3-person rooms (trios)
-- When participant count is odd, instead of assigning a bye,
-- the last unmatched participant joins an existing pair to form a trio.

ALTER TABLE matches ADD COLUMN participant_c_id UUID REFERENCES users(id);

-- Index for the new column (partial — most matches are pairs)
CREATE INDEX idx_matches_participant_c ON matches(participant_c_id) WHERE participant_c_id IS NOT NULL;

-- Ensure participant C is not the same as A or B
ALTER TABLE matches ADD CONSTRAINT no_self_match_c
  CHECK (participant_c_id IS NULL OR (participant_c_id != participant_a_id AND participant_c_id != participant_b_id));
