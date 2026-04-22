// ─── Session State Snapshot (T0-3) ──────────────────────────────────────────
//
// Single source of truth for the "what's the current state of this session?"
// payload. Returns the same shape whether read via:
//   - REST: GET /api/sessions/:id/state           (this T0-3 endpoint)
//   - Socket: emit('session:state', ...)          (existing on-join emit)
//
// Source-of-truth resolution (in order):
//   1. activeSessions Map (in-memory) — most current; reflects pause, timer,
//      pendingRoundNumber, manuallyLeftRound, etc.
//   2. sessions table (DB) — fallback for sessions not currently active in
//      memory (e.g. server restart before recovery completes, or session
//      finished/scheduled and not in activeSessions).
//
// Why split out: previously the session:state emit at participant-flow.ts:279
// was the only way clients could resync. New REST endpoint reuses this same
// builder so the two paths can never drift apart.

import { Server as SocketServer } from 'socket.io';
import { query } from '../../db';
import { SessionStatus, SessionConfig } from '@rsn/shared';
import { activeSessions, sessionRoom } from '../orchestration/state/session-state';
import * as sessionService from './session.service';

export interface SessionStateSnapshot {
  sessionId: string;
  sessionStatus: SessionStatus;
  currentRound: number;
  totalRounds: number;
  isPaused: boolean;
  /** Server-side wall-clock end of the current segment (ISO 8601). null when paused or no timer running. */
  timerEndsAt: string | null;
  /** Frozen remaining ms when paused. null otherwise. Used by clients to render the held value. */
  pausedTimeRemainingMs: number | null;
  /** Pre-generated round number awaiting host confirm (null when none). */
  pendingRoundNumber: number | null;

  hostUserId: string | null;
  /** Co-host user IDs assigned to this session. */
  cohosts: string[];

  /** Real-time socket presence — users currently connected to this session's socket room. */
  connectedParticipants: Array<{ userId: string; displayName: string }>;
  /** Whether the host's socket is currently in the lobby room. */
  hostInLobby: boolean;

  /** Coarse counts. Refined further in T1-4. */
  participantCounts: {
    /** Sockets currently in the session room. */
    connected: number;
    /** Rows in session_participants with status NOT IN ('removed', 'left', 'no_show'). */
    registered: number;
  };

  /** UI hint propagated from session config. */
  timerVisibility: string;
}

/**
 * Build a self-contained session-state snapshot. Reads from the in-memory
 * `activeSessions` Map first; falls back to the `sessions` table when the
 * session isn't currently held in memory.
 *
 * Pure read — never mutates state, never emits.
 */
export async function buildSessionStateSnapshot(
  sessionId: string,
  io: SocketServer | null,
): Promise<SessionStateSnapshot | null> {
  // ── DB row (source of truth for static fields) ─────────────────────────
  const session = await sessionService.getSessionById(sessionId).catch(() => null);
  if (!session) return null;

  const config: SessionConfig =
    typeof session.config === 'string'
      ? JSON.parse(session.config as unknown as string)
      : (session.config as unknown as SessionConfig) || ({} as SessionConfig);

  // ── activeSessions overlay (preferred when present) ────────────────────
  const activeSession = activeSessions.get(sessionId);

  // ── Connected participants (real-time socket presence) ────────────────
  // io is optional so this helper can be called in pure-DB contexts (e.g.
  // background reconciler, future tests). When io is missing, leave
  // connected counts at 0 — REST callers always pass io, they always get
  // the real number.
  let connectedParticipants: Array<{ userId: string; displayName: string }> = [];
  let hostInLobby = false;
  if (io) {
    const socketsInRoom = await io.in(sessionRoom(sessionId)).fetchSockets();
    connectedParticipants = socketsInRoom
      .map(s => ({
        userId: (s.data as any)?.userId,
        displayName: (s.data as any)?.displayName || 'User',
      }))
      .filter(p => p.userId);
    hostInLobby = socketsInRoom.some(s => (s.data as any)?.userId === session.hostUserId);
  }

  // ── Co-hosts ────────────────────────────────────────────────────────────
  const cohostResult = await query<{ user_id: string }>(
    `SELECT user_id FROM session_cohosts WHERE session_id = $1`,
    [sessionId],
  );
  const cohosts = cohostResult.rows.map(r => r.user_id);

  // ── Registered count (filtered for ghost/no-show) ─────────────────────
  const registeredRes = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM session_participants
     WHERE session_id = $1 AND status NOT IN ('removed', 'left', 'no_show')`,
    [sessionId],
  );
  const registeredCount = parseInt(registeredRes.rows[0]?.c || '0', 10);

  // ── Compose snapshot ───────────────────────────────────────────────────
  return {
    sessionId,
    sessionStatus: activeSession?.status ?? session.status,
    currentRound: activeSession?.currentRound ?? session.currentRound,
    totalRounds: config.numberOfRounds || 5,
    isPaused: activeSession?.isPaused ?? false,
    timerEndsAt: activeSession?.timerEndsAt?.toISOString() ?? null,
    pausedTimeRemainingMs: activeSession?.pausedTimeRemaining ?? null,
    pendingRoundNumber: activeSession?.pendingRoundNumber ?? null,

    hostUserId: session.hostUserId ?? null,
    cohosts,

    connectedParticipants,
    hostInLobby,

    participantCounts: {
      connected: connectedParticipants.length,
      registered: registeredCount,
    },

    timerVisibility: (config as any).timerVisibility || 'last_10s',
  };
}
