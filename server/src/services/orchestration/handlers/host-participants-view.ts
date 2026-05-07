// ─── Host Participants View ────────────────────────────────────────────────
//
// Phase 7C.1 (7 May spec, Stefan #3 + #11) — backing data for the Host
// Control Center drawer. Single source of truth for the participants
// list shown to the host: who's here, what role, what state. Joined
// to host:round_dashboard payloads so the live drawer updates on the
// same cadence as room status changes.
//
// State derivation order (highest precedence first):
//   1. session_participants.status in {'left','no_show','removed'} -> 'left'
//   2. user is in any active match (matches arg)                    -> 'in_room'
//   3. status='disconnected' OR not in presenceMap                   -> 'disconnected'
//   4. otherwise                                                     -> 'in_main_room'
//
// Role: hostUserId match -> 'host'; row in session_cohosts -> 'cohost';
// else 'participant'. Never derived from session_participants.role —
// session_cohosts is the canonical source post-Phase 7A.5.

import { query } from '../../../db';

export type HostParticipantState =
  | 'in_main_room'
  | 'in_room'
  | 'disconnected'
  | 'left';

export type HostParticipantRole = 'host' | 'cohost' | 'participant';

export interface HostParticipantSummary {
  userId: string;
  displayName: string;
  email: string | null;
  role: HostParticipantRole;
  state: HostParticipantState;
  currentMatchId: string | null;
  currentRoomId: string | null;
  joinedAt: string;
}

interface MatchLike {
  id: string;
  roomId?: string | null;
  participantAId?: string | null;
  participantBId?: string | null;
  participantCId?: string | null;
  status: string;
}

interface ParticipantRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  status: string;
  joined_at: Date;
  is_cohost: boolean;
}

export async function buildHostParticipantsView(opts: {
  sessionId: string;
  hostUserId: string;
  presenceMap: Map<string, unknown>;
  activeMatches?: MatchLike[];
}): Promise<HostParticipantSummary[]> {
  const rows = await query<ParticipantRow>(
    `SELECT
       sp.user_id,
       u.display_name,
       u.email,
       sp.status,
       sp.joined_at,
       (sc.user_id IS NOT NULL) AS is_cohost
     FROM session_participants sp
     LEFT JOIN users u ON u.id = sp.user_id
     LEFT JOIN session_cohosts sc
       ON sc.session_id = sp.session_id AND sc.user_id = sp.user_id
     WHERE sp.session_id = $1
     ORDER BY sp.joined_at ASC`,
    [opts.sessionId],
  );

  const userToMatch = new Map<string, { matchId: string; roomId: string | null }>();
  for (const m of opts.activeMatches || []) {
    if (m.status !== 'active') continue;
    const room = { matchId: m.id, roomId: m.roomId ?? null };
    if (m.participantAId) userToMatch.set(m.participantAId, room);
    if (m.participantBId) userToMatch.set(m.participantBId, room);
    if (m.participantCId) userToMatch.set(m.participantCId, room);
  }

  return rows.rows.map((r: ParticipantRow) => {
    const role: HostParticipantRole =
      r.user_id === opts.hostUserId
        ? 'host'
        : r.is_cohost
        ? 'cohost'
        : 'participant';

    const inMatch = userToMatch.get(r.user_id);
    let state: HostParticipantState;
    if (r.status === 'left' || r.status === 'no_show' || r.status === 'removed') {
      state = 'left';
    } else if (inMatch) {
      state = 'in_room';
    } else if (r.status === 'disconnected' || !opts.presenceMap.has(r.user_id)) {
      state = 'disconnected';
    } else {
      state = 'in_main_room';
    }

    const fallback = r.email ? r.email.split('@')[0] : 'Participant';
    return {
      userId: r.user_id,
      displayName: r.display_name || fallback,
      email: r.email,
      role,
      state,
      currentMatchId: inMatch?.matchId ?? null,
      currentRoomId: inMatch?.roomId ?? null,
      joinedAt: r.joined_at.toISOString(),
    };
  });
}
