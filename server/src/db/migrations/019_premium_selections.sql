-- ─── Migration 019: Premium Selections ───────────────────────────────────────
-- Stores premium user pre-selections: up to 12 preferred people per event.
-- Foundation only — matching engine integration comes later.

BEGIN;

CREATE TABLE IF NOT EXISTS premium_selections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  selected_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- No duplicate selections
  CONSTRAINT uq_premium_selection UNIQUE (user_id, session_id, selected_user_id),
  -- Cannot select yourself
  CONSTRAINT chk_no_self_select CHECK (user_id != selected_user_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_sel_user_session ON premium_selections(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_premium_sel_selected ON premium_selections(selected_user_id, session_id);

COMMIT;
