// ─── Match Validator (T0-1) ─────────────────────────────────────────────────
//
// Single audited gatekeeper for every code path that writes to the `matches`
// table. Replaces the ad-hoc per-handler checks (or absence thereof) in
// `handleHostCreateBreakout`, `handleHostCreateBreakoutBulk`,
// `handleHostSwapMatch`, and `handleHostExcludeFromRound`.
//
// Two layers of validation:
//
// 1. **Structural** (always run, no DB roundtrip):
//    - participantAId is required (≥1 participant)
//    - All non-null participant IDs are distinct
//    - Optional: caller can require ≥N via `minParticipants`
//
// 2. **Cross-match conflict** (DB-aware, opt-out via `skipConflictCheck`):
//    - No other match in this session+round (with one of `conflictingStatuses`,
//      defaulting to `['active']`) holds any of these participants
//    - When updating an existing match, pass `excludeMatchId` so the match
//      under edit isn't flagged as conflicting with itself
//
// The validator NEVER throws. It returns `{ valid, errors[], conflictingUserIds[] }`
// so handlers can emit a structured socket error to the host UI.

import { query } from '../../db';

export type MatchStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'no_show' | 'reassigned';

export interface MatchValidationInput {
  sessionId: string;
  roundNumber: number;
  participantAId: string;
  participantBId?: string | null;
  participantCId?: string | null;
  /** Skip the participant in this match when checking conflicts (UPDATE case). */
  excludeMatchId?: string;
  /** Skip the cross-match DB query (use when caller has just reassigned conflicts). */
  skipConflictCheck?: boolean;
  /** Match statuses considered "occupied" for conflict purposes. Default: ['active']. */
  conflictingStatuses?: MatchStatus[];
  /** Minimum participant count to consider valid. Default: 1 (allow solo holder rooms). */
  minParticipants?: number;
}

export interface MatchValidationResult {
  valid: boolean;
  errors: string[];
  /** User IDs that are already in another active match in this session+round. */
  conflictingUserIds: string[];
}

const DEFAULT_CONFLICTING_STATUSES: MatchStatus[] = ['active'];

export async function validateMatchAssignment(
  input: MatchValidationInput
): Promise<MatchValidationResult> {
  const {
    sessionId,
    roundNumber,
    participantAId,
    participantBId = null,
    participantCId = null,
    excludeMatchId,
    skipConflictCheck = false,
    conflictingStatuses = DEFAULT_CONFLICTING_STATUSES,
    minParticipants = 1,
  } = input;

  const errors: string[] = [];
  const conflictingUserIds: string[] = [];

  // ── Structural rule 1: participantAId is required ─────────────────────────
  if (!participantAId) {
    errors.push('participantAId is required (at least one participant)');
  }

  // ── Build deduplicated, non-null participant list ────────────────────────
  const ids = [participantAId, participantBId, participantCId].filter(
    (id): id is string => !!id
  );
  const uniqueIds = Array.from(new Set(ids));

  // ── Structural rule 2: all non-null IDs are distinct ─────────────────────
  if (uniqueIds.length !== ids.length) {
    errors.push('Participant IDs must be unique within a match (no duplicates)');
  }

  // ── Structural rule 3: minimum count (caller-configurable) ───────────────
  if (uniqueIds.length < minParticipants) {
    errors.push(
      `Match must have at least ${minParticipants} unique participant${minParticipants === 1 ? '' : 's'}, got ${uniqueIds.length}`
    );
  }

  // ── Conflict check (opt-out) ──────────────────────────────────────────────
  if (!skipConflictCheck && uniqueIds.length > 0 && participantAId) {
    // Inline the status list so this query stays parameter-bound for sessionId,
    // roundNumber, excludeMatchId, and the participant id array. Statuses are
    // an internal allow-list (TypeScript type), not user input.
    const statusInClause = conflictingStatuses.map(s => `'${s}'`).join(', ');

    const conflictQuery = `
      SELECT id AS match_id, user_id
      FROM matches m,
           LATERAL UNNEST(ARRAY[m.participant_a_id, m.participant_b_id, m.participant_c_id]) AS user_id
      WHERE m.session_id = $1
        AND m.round_number = $2
        AND m.status IN (${statusInClause})
        AND m.id != COALESCE($3, '00000000-0000-0000-0000-000000000000'::uuid)
        AND user_id = ANY($4)
        AND user_id IS NOT NULL
    `;

    const conflictResult = await query<{ match_id: string; user_id: string }>(
      conflictQuery,
      [sessionId, roundNumber, excludeMatchId || null, uniqueIds]
    );

    if (conflictResult.rows.length > 0) {
      const conflictSet = new Set(conflictResult.rows.map(r => r.user_id));
      conflictingUserIds.push(...conflictSet);
      errors.push(
        `${conflictSet.size} participant${conflictSet.size === 1 ? ' is' : 's are'} already in another active match in this round`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    conflictingUserIds,
  };
}
