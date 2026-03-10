-- ─── Migration: 003_join_requests ────────────────────────────────────────────
-- Join requests table for the "Request to Join" flow.
-- Users without an invite can submit a request that admins vet.

CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE join_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  linkedin_url    TEXT NOT NULL,
  reason          TEXT NOT NULL,
  status          join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_join_requests_email ON join_requests(email);
CREATE INDEX idx_join_requests_status ON join_requests(status);
CREATE INDEX idx_join_requests_created ON join_requests(created_at DESC);
