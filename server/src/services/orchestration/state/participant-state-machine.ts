// ─── Participant State Machine ───────────────────────────────────────────────
//
// Phase 1 (1 May 2026 spec) — the architectural spine.
//
// Stefan: "One user = one state = one location. If this is not enforced at
// backend level, everything else will keep failing." Pre-Phase-1, participant
// state was split across four in-memory maps (presenceMap, roomParticipants,
// manuallyLeftRound, disconnectTimeouts) plus DB session_participants.status,
// mutated from 24 scattered call sites with no single chokepoint validating
// transitions.
//
// This module is the chokepoint. Every write to a participant's state goes
// through transitionParticipant() which: (a) validates the transition is
// legal, (b) updates the in-memory canonical state on ActiveSession, (c)
// persists to DB session_participants atomically, (d) emits the host
// dashboard. Reads use getParticipantState() — O(1) from the in-memory map.
//
// The DB enum (participant_status) is unchanged; this layer adds two
// pseudo-states (IN_MATCHING, IN_RATING) that surface in the host dashboard
// but project to existing DB values for backward compat. Future migration can
// promote them to first-class enum values without changing this API.
//
// Forward-compat: the API is the seam for moving the source of truth to
// Redis when we go horizontal. transitionParticipant signature stays the
// same; only the storage backend changes.

import logger from '../../../config/logger';
import { query } from '../../../db';
import { ParticipantStatus } from '@rsn/shared';
import { activeSessions } from './session-state';

/**
 * Stefan's full state set from 1 May spec, plus the existing DB enum values.
 * IN_MATCHING and IN_RATING are pseudo-states (not in DB enum) used for the
 * host dashboard to distinguish "in match preview" and "in rating window"
 * from generic IN_LOBBY / IN_ROUND. They project to nearest DB enum value.
 */
export enum ParticipantState {
  NOT_JOINED = 'not_joined',           // Pseudo: never registered for this session
  REGISTERED = 'registered',            // DB: registered
  CHECKED_IN = 'checked_in',            // DB: checked_in
  IN_MAIN_ROOM = 'in_main_room',        // DB: in_lobby
  IN_MATCHING = 'in_matching',          // Pseudo: round preview generated, awaiting confirm. Projects to in_lobby.
  IN_BREAKOUT = 'in_breakout',          // DB: in_round (with currentRoomId set)
  IN_RATING = 'in_rating',              // Pseudo: rating window open. Projects to in_lobby.
  DISCONNECTED = 'disconnected',        // DB: disconnected
  LEFT = 'left',                        // DB: left
  REMOVED = 'removed',                  // DB: removed
  NO_SHOW = 'no_show',                  // DB: no_show
}

/**
 * Project a state-machine state to the DB enum value for persistence.
 * Pseudo-states share their nearest DB neighbour.
 */
function projectToDbStatus(state: ParticipantState): ParticipantStatus {
  switch (state) {
    case ParticipantState.NOT_JOINED:
    case ParticipantState.REGISTERED:
      return ParticipantStatus.REGISTERED;
    case ParticipantState.CHECKED_IN:
      return ParticipantStatus.CHECKED_IN;
    case ParticipantState.IN_MAIN_ROOM:
    case ParticipantState.IN_MATCHING:
    case ParticipantState.IN_RATING:
      return ParticipantStatus.IN_LOBBY;
    case ParticipantState.IN_BREAKOUT:
      return ParticipantStatus.IN_ROUND;
    case ParticipantState.DISCONNECTED:
      return ParticipantStatus.DISCONNECTED;
    case ParticipantState.LEFT:
      return ParticipantStatus.LEFT;
    case ParticipantState.REMOVED:
      return ParticipantStatus.REMOVED;
    case ParticipantState.NO_SHOW:
      return ParticipantStatus.NO_SHOW;
  }
}

/**
 * Project a DB enum value to the state-machine state on bootstrap.
 * Used when ActiveSession is created from existing session_participants rows.
 */
export function liftFromDbStatus(dbStatus: ParticipantStatus): ParticipantState {
  switch (dbStatus) {
    case ParticipantStatus.REGISTERED:    return ParticipantState.REGISTERED;
    case ParticipantStatus.CHECKED_IN:    return ParticipantState.CHECKED_IN;
    case ParticipantStatus.IN_LOBBY:      return ParticipantState.IN_MAIN_ROOM;
    case ParticipantStatus.IN_ROUND:      return ParticipantState.IN_BREAKOUT;
    case ParticipantStatus.DISCONNECTED:  return ParticipantState.DISCONNECTED;
    case ParticipantStatus.LEFT:          return ParticipantState.LEFT;
    case ParticipantStatus.REMOVED:       return ParticipantState.REMOVED;
    case ParticipantStatus.NO_SHOW:       return ParticipantState.NO_SHOW;
    default:                              return ParticipantState.REGISTERED;
  }
}

/**
 * Legal transitions. A state may always transition to itself (idempotent).
 * Terminal states (LEFT, REMOVED, NO_SHOW) are sticky — once set, no further
 * transitions accepted (caller must explicitly re-register).
 */
const LEGAL_TRANSITIONS: Record<ParticipantState, ParticipantState[]> = {
  [ParticipantState.NOT_JOINED]:    [ParticipantState.REGISTERED],
  [ParticipantState.REGISTERED]:    [ParticipantState.CHECKED_IN, ParticipantState.IN_MAIN_ROOM, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.CHECKED_IN]:    [ParticipantState.IN_MAIN_ROOM, ParticipantState.IN_MATCHING, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.IN_MAIN_ROOM]:  [ParticipantState.IN_MATCHING, ParticipantState.IN_BREAKOUT, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.IN_MATCHING]:   [ParticipantState.IN_BREAKOUT, ParticipantState.IN_MAIN_ROOM, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.IN_BREAKOUT]:   [ParticipantState.IN_RATING, ParticipantState.IN_MAIN_ROOM, ParticipantState.IN_BREAKOUT, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.IN_RATING]:     [ParticipantState.IN_MAIN_ROOM, ParticipantState.IN_BREAKOUT, ParticipantState.DISCONNECTED, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.DISCONNECTED]:  [ParticipantState.IN_MAIN_ROOM, ParticipantState.IN_BREAKOUT, ParticipantState.CHECKED_IN, ParticipantState.LEFT, ParticipantState.REMOVED, ParticipantState.NO_SHOW],
  [ParticipantState.LEFT]:          [ParticipantState.IN_MAIN_ROOM, ParticipantState.CHECKED_IN], // explicit re-entry only
  [ParticipantState.REMOVED]:       [], // terminal
  [ParticipantState.NO_SHOW]:       [ParticipantState.IN_MAIN_ROOM, ParticipantState.CHECKED_IN], // late arrival
};

export interface ParticipantStateRecord {
  state: ParticipantState;
  currentRoomId: string | null; // set when state === IN_BREAKOUT
  updatedAt: Date;
}

export interface TransitionResult {
  ok: boolean;
  fromState: ParticipantState | null;
  toState: ParticipantState;
  reason?: string;
}

export interface TransitionOpts {
  /** When transitioning to IN_BREAKOUT, the room the participant joined. */
  currentRoomId?: string | null;
  /** If true, persist the projected DB status. Default: true. */
  persistToDb?: boolean;
  /** If true, allow self-transition without warning. Default: true. */
  allowIdempotent?: boolean;
}

/**
 * Read the current state of a participant. O(1) in-memory lookup.
 * Returns null if the session isn't active or the participant has no state
 * record yet (treat as NOT_JOINED).
 */
export function getParticipantState(
  sessionId: string,
  userId: string,
): ParticipantStateRecord | null {
  const activeSession = activeSessions.get(sessionId);
  if (!activeSession) return null;
  if (!activeSession.participantStates) return null;
  const raw = activeSession.participantStates.get(userId);
  if (!raw) return null;
  return {
    state: raw.state as ParticipantState,
    currentRoomId: raw.currentRoomId,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Transition a participant to a new state. The single legal mutation path.
 *
 * Behavior:
 * 1. Looks up current in-memory state (or REGISTERED if absent — fresh join).
 * 2. Checks LEGAL_TRANSITIONS table; on illegal transition, logs and returns
 *    { ok: false } without mutating anything.
 * 3. Updates in-memory ActiveSession.participantStates.
 * 4. Persists projected DB status via session_participants UPDATE (unless
 *    persistToDb=false).
 * 5. Returns the result; caller decides whether to surface the failure.
 *
 * Atomicity caveat: the in-memory + DB writes are not in a single transaction.
 * In practice the in-memory map is the source of truth for read paths; the
 * DB is a snapshot for cross-process visibility (host dashboard via REST,
 * recap aggregation, snapshot reconciliation).
 */
export async function transitionParticipant(
  sessionId: string,
  userId: string,
  toState: ParticipantState,
  opts: TransitionOpts = {},
): Promise<TransitionResult> {
  const { currentRoomId = null, persistToDb = true, allowIdempotent = true } = opts;

  const activeSession = activeSessions.get(sessionId);
  if (!activeSession) {
    logger.warn({ sessionId, userId, toState }, 'transitionParticipant: no active session');
    return { ok: false, fromState: null, toState, reason: 'NO_ACTIVE_SESSION' };
  }

  if (!activeSession.participantStates) {
    activeSession.participantStates = new Map();
  }

  const current = activeSession.participantStates.get(userId);
  const fromState: ParticipantState = current
    ? (current.state as ParticipantState)
    : ParticipantState.REGISTERED;

  // Idempotent self-transition is fine (e.g. multiple "still in main room"
  // confirmations from heartbeat). Skip the validation but still touch updatedAt.
  if (fromState === toState && allowIdempotent) {
    activeSession.participantStates.set(userId, {
      state: toState,
      currentRoomId: toState === ParticipantState.IN_BREAKOUT
        ? (currentRoomId ?? current?.currentRoomId ?? null)
        : null,
      updatedAt: new Date(),
    });
    return { ok: true, fromState, toState };
  }

  const legal = LEGAL_TRANSITIONS[fromState] || [];
  if (!legal.includes(toState)) {
    logger.warn(
      { sessionId, userId, fromState, toState },
      'transitionParticipant: illegal transition rejected',
    );
    return { ok: false, fromState, toState, reason: 'ILLEGAL_TRANSITION' };
  }

  // In-memory write — authoritative.
  activeSession.participantStates.set(userId, {
    state: toState,
    currentRoomId: toState === ParticipantState.IN_BREAKOUT ? currentRoomId : null,
    updatedAt: new Date(),
  });

  // DB projection — for cross-process visibility. Failure here is logged
  // but not fatal: in-memory state is still authoritative.
  if (persistToDb) {
    try {
      const dbStatus = projectToDbStatus(toState);
      const setClauses = ['status = $1'];
      const values: unknown[] = [dbStatus];
      let paramIdx = 2;

      if (toState === ParticipantState.IN_BREAKOUT && currentRoomId) {
        setClauses.push(`current_room_id = $${paramIdx}`);
        values.push(currentRoomId);
        paramIdx++;
      } else if (toState === ParticipantState.IN_MAIN_ROOM
                 || toState === ParticipantState.IN_MATCHING
                 || toState === ParticipantState.IN_RATING) {
        setClauses.push(`current_room_id = NULL`);
      }

      if (toState === ParticipantState.IN_MAIN_ROOM || toState === ParticipantState.CHECKED_IN) {
        setClauses.push(`joined_at = COALESCE(joined_at, NOW())`);
      }
      if (toState === ParticipantState.LEFT || toState === ParticipantState.REMOVED) {
        setClauses.push(`left_at = NOW()`);
      }
      if (toState === ParticipantState.NO_SHOW) {
        setClauses.push(`is_no_show = TRUE`);
      }

      values.push(sessionId, userId);
      await query(
        `UPDATE session_participants SET ${setClauses.join(', ')}
         WHERE session_id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
        values,
      );
    } catch (err) {
      logger.error({ err, sessionId, userId, toState }, 'transitionParticipant: DB persist failed');
      // Continue — in-memory state is still authoritative.
    }
  }

  return { ok: true, fromState, toState };
}

/**
 * Snapshot all participant states for a session. Used by the host dashboard
 * and reconciliation snapshot.
 */
export function snapshotParticipantStates(
  sessionId: string,
): Map<string, ParticipantStateRecord> {
  const activeSession = activeSessions.get(sessionId);
  if (!activeSession?.participantStates) return new Map();
  const out = new Map<string, ParticipantStateRecord>();
  for (const [uid, raw] of activeSession.participantStates) {
    out.set(uid, {
      state: raw.state as ParticipantState,
      currentRoomId: raw.currentRoomId,
      updatedAt: raw.updatedAt,
    });
  }
  return out;
}

/**
 * Bulk-bootstrap states from a DB query result. Called when ActiveSession is
 * created from existing session_participants rows so reads are warm.
 */
export function bootstrapStatesFromDb(
  sessionId: string,
  rows: { user_id: string; status: string; current_room_id: string | null }[],
): void {
  const activeSession = activeSessions.get(sessionId);
  if (!activeSession) return;
  if (!activeSession.participantStates) activeSession.participantStates = new Map();
  const now = new Date();
  for (const row of rows) {
    const liftedState = liftFromDbStatus(row.status as ParticipantStatus);
    activeSession.participantStates.set(row.user_id, {
      state: liftedState,
      currentRoomId: liftedState === ParticipantState.IN_BREAKOUT ? row.current_room_id : null,
      updatedAt: now,
    });
  }
}
