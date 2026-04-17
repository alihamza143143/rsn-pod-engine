// ─── Shared session-status presentation config ──────────────────────────────
// Single source of truth for converting session.status enum values into
// user-facing labels, Badge colors, and lifecycle phase classification.
//
// Before this util, SessionDetailPage used `status.replace(/_/g, ' ')` which
// produced lowercase "lobby open" strings; AdminSessionsPage rendered raw
// enum values; LiveSessionPage had its own STATE_CONFIG. Use these helpers
// for any generic status-chip display. LiveSessionPage keeps its local
// STATE_CONFIG because it has richer, context-specific copy per phase.

export type SessionStatus =
  | 'scheduled'
  | 'lobby_open'
  | 'round_active'
  | 'round_rating'
  | 'round_transition'
  | 'closing_lobby'
  | 'completed'
  | 'cancelled';

export type StatusPhase = 'pre' | 'live' | 'done' | 'cancelled';

const LABEL_MAP: Record<SessionStatus, string> = {
  scheduled: 'Scheduled',
  lobby_open: 'Lobby open',
  round_active: 'Round active',
  round_rating: 'Rating',
  round_transition: 'Transition',
  closing_lobby: 'Closing lobby',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Mirrors Badge component variants: 'default' | 'success' | 'info' | 'warning' | 'danger' | 'brand'
const COLOR_MAP: Record<SessionStatus, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  scheduled: 'default',
  lobby_open: 'info',
  round_active: 'success',
  round_rating: 'warning',
  round_transition: 'info',
  closing_lobby: 'warning',
  completed: 'default',
  cancelled: 'danger',
};

const PHASE_MAP: Record<SessionStatus, StatusPhase> = {
  scheduled: 'pre',
  lobby_open: 'live',
  round_active: 'live',
  round_rating: 'live',
  round_transition: 'live',
  closing_lobby: 'live',
  completed: 'done',
  cancelled: 'cancelled',
};

export function sessionStatusLabel(s: string | undefined | null): string {
  return (s && LABEL_MAP[s as SessionStatus]) || 'Unknown';
}

export function sessionStatusColor(s: string | undefined | null) {
  return (s && COLOR_MAP[s as SessionStatus]) || 'default';
}

export function sessionStatusPhase(s: string | undefined | null): StatusPhase {
  return (s && PHASE_MAP[s as SessionStatus]) || 'pre';
}
