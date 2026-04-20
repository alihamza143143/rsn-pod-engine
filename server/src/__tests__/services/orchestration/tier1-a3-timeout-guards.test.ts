// Tier-1 A3 — session-end guards on deferred callbacks
//
// Every setTimeout in the orchestration handlers captures `io`,
// `activeSession`, participant arrays, and imported configs in its
// closure. If a host ends the session during the delay, the callback
// still fires and operates on stale data — emitting to disconnected
// sockets, touching DB rows whose parent session is gone, etc.
//
// The fix pattern is minimal and surgical: first line of every deferred
// async callback is an `activeSessions.get(sessionId)` check with an
// early return on miss. Timer-manager's managed timer and the existing
// `disconnectTimeouts` registry already handle their own lifecycles —
// this test covers the one-off setTimeouts that don't.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(relPath: string): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../services/orchestration/handlers', relPath),
    'utf8',
  );
}

describe('Tier-1 A3 — deferred-callback session-end guards', () => {
  describe('host-actions.ts host-remove 5s partner-return', () => {
    const src = readSource('host-actions.ts');

    it('the 5-second setTimeout checks activeSessions before doing work', () => {
      // Locate the specific setTimeout by its trailing 5 000 ms argument
      // and verify the first statement inside the callback is a guard.
      const timeoutIdx = src.indexOf('Server-side 5s timeout');
      expect(timeoutIdx).toBeGreaterThan(-1);
      const block = src.slice(timeoutIdx, timeoutIdx + 1200);
      expect(block).toMatch(/setTimeout\(async \(\) => \{[\s\S]*?const currentSession = activeSessions\.get\(data\.sessionId\)/);
      expect(block).toMatch(/if \(!currentSession\)/);
    });
  });

  describe('other orchestration deferred callbacks are already guarded', () => {
    it('host-actions host:create_breakout setTimeout guards session + ROUND_ACTIVE status', () => {
      const src = readSource('host-actions.ts');
      // This is the host:create_breakout re-matching after 5 s delay.
      expect(src).toMatch(/setTimeout\(async \(\) => \{[\s\S]{0,300}?const s = activeSessions\.get\(sessionId\)/);
      expect(src).toMatch(/if \(!s \|\| s\.status !== SessionStatus\.ROUND_ACTIVE\)/);
    });

    it('participant-flow auto-reassign 5s setTimeout guards on currentSession', () => {
      const src = readSource('participant-flow.ts');
      expect(src).toMatch(/setTimeout\(async \(\) => \{[\s\S]{0,200}?const currentSession = activeSessions\.get\(sessionId\)/);
      // One of these guard blocks must early-return on null
      expect(src).toMatch(/if \(!currentSession\) return/);
    });

    it('participant-flow disconnect 15s setTimeout registers into disconnectTimeouts for cancellation', () => {
      const src = readSource('participant-flow.ts');
      // Has its own registry — cleared from disconnectTimeouts at the top
      // of the callback + on reconnect.
      expect(src).toMatch(/disconnectTimeouts\.delete\(timeoutKey\)/);
    });

    it('round-lifecycle detectNoShows guards on activeSession.status === ROUND_ACTIVE', () => {
      const src = readSource('round-lifecycle.ts');
      // The noShowTimeout schedules detectNoShows, which itself guards.
      expect(src).toMatch(/export async function detectNoShows\([\s\S]{0,200}?const activeSession = activeSessions\.get\(sessionId\)/);
      expect(src).toMatch(/if \(!activeSession \|\| activeSession\.status !== SessionStatus\.ROUND_ACTIVE\) return/);
    });
  });
});
