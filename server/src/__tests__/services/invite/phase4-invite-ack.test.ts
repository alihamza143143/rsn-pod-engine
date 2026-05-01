// Phase 4 (1 May 2026 spec) — Invite flow: server-confirmed registration
//
// Stefan reported: "Accept → 404 → magically works". Root cause: post-Phase-T0-4
// the server transaction commits cleanly, but the client navigated before
// React Query caches refetched, so the live page rendered against a stale
// "you're not in this session" cache and the user saw 404 until they clicked
// again. Phase 4 fix: server returns participantStatus in the accept response;
// client awaits the critical refetches before navigating.

import * as fs from 'fs';
import * as path from 'path';

function readServer(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');
}

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../../../', rel), 'utf8');
}

describe('Phase 4 — invite flow registered ack', () => {
  describe('server invite.service.ts returns participantStatus', () => {
    const src = readServer('services/invite/invite.service.ts');

    it('AcceptInviteResult declares optional participantStatus', () => {
      const ifaceStart = src.indexOf('export interface AcceptInviteResult');
      // Walk to the closing brace at column 0 (full interface end).
      const ifaceEnd = src.indexOf('\n}', ifaceStart);
      const iface = src.slice(ifaceStart, ifaceEnd);
      expect(iface).toMatch(/participantStatus\?\s*:\s*string/);
    });

    it('happy-path acceptInvite reads back session_participants.status', () => {
      // Last return in acceptInvite should populate participantStatus.
      const acceptIdx = src.indexOf('export async function acceptInvite');
      const slice = src.slice(acceptIdx);
      expect(slice).toMatch(/SELECT status FROM session_participants/);
      expect(slice).toMatch(/participantStatus,?\s*\n\s*\}/);
    });

    it('idempotent re-acceptance also returns participantStatus', () => {
      const idempIdx = src.indexOf('isIdempotent');
      const slice = src.slice(idempIdx, idempIdx + 1500);
      expect(slice).toMatch(/participantStatusIdempotent/);
    });
  });

  describe('client InviteAcceptPage awaits refetch before navigating', () => {
    const src = readRepo('client/src/features/invites/InviteAcceptPage.tsx');

    it('awaits Promise.all of refetchQueries on session and session-participants', () => {
      expect(src).toMatch(/await Promise\.all\(\[[\s\S]*?qc\.refetchQueries\([\s\S]*?session-participants[\s\S]*?qc\.refetchQueries\([\s\S]*?session/);
    });

    it('refuses to navigate when server did not confirm participantStatus (session invite)', () => {
      expect(src).toMatch(/if \(sid && !pStatus\)/);
      expect(src).toMatch(/Registration not confirmed by server/);
    });

    it('still uses navigate (SPA transition, not window.location.href)', () => {
      expect(src).toMatch(/navigate\(destination, \{ replace: true \}\)/);
    });
  });
});
