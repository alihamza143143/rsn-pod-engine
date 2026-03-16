-- ─── Migration 021: Matching Templates ───────────────────────────────────────
-- Foundation for the template system from the Matching Engine spec.
-- Templates store named matching configurations that can be assigned to pods.

BEGIN;

CREATE TABLE IF NOT EXISTS matching_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Scoring weights (0.0 – 1.0)
  weight_industry     REAL NOT NULL DEFAULT 0.3,
  weight_interests    REAL NOT NULL DEFAULT 0.3,
  weight_intent       REAL NOT NULL DEFAULT 0.2,
  weight_experience   REAL NOT NULL DEFAULT 0.1,
  weight_location     REAL NOT NULL DEFAULT 0.1,

  -- Matching behaviour
  rematch_cooldown_rounds  INTEGER NOT NULL DEFAULT 3,
  exploration_level        REAL NOT NULL DEFAULT 0.2,
  same_company_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_strategy        VARCHAR(50) NOT NULL DEFAULT 'random',

  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_templates_default ON matching_templates(is_default) WHERE is_default = TRUE;

-- Link pods to templates (optional FK)
ALTER TABLE pods ADD COLUMN IF NOT EXISTS matching_template_id UUID REFERENCES matching_templates(id) ON DELETE SET NULL;

-- Seed one default template
INSERT INTO matching_templates (name, description, is_default) VALUES
  ('Speed Networking Default', 'Balanced scoring for general speed networking events. Equal weight on industry and interests.', TRUE)
ON CONFLICT DO NOTHING;

COMMIT;
