// ─── Dr Arch — April 19 deep audit + fixes ───────────────────────────────
//
// Architectural bugs found during live testing on 2026-04-19:
//
//   Bug 6 (sharpening) — Video tile STILL zoomed on desktop despite the
//   2026-04-18 object-contain fix. Root cause: @livekit/components-styles
//   ships `.lk-participant-media-video { object-fit: cover }` with higher
//   specificity than our Tailwind `object-contain` className on the
//   wrapper. Fix: global CSS override in client/src/index.css forces
//   object-fit: contain on .lk-participant-media-video.
//
//   Bug 7 — Manual breakout "Create" lets host yank participants out of
//   an active match (algorithm or manual). Root cause: bulk-create
//   silently reassigned existing active matches (breakout-bulk.ts:152-174)
//   AND client modal rendered the "(in room)" label in blue but kept the
//   checkbox selectable. Fix: server rejects with
//   PARTICIPANT_IN_ACTIVE_ROOM, client disables the checkbox for anyone
//   inActiveRoom.
//
//   Bug 8 — Host timer and breakout-participant timer drifted (8:17 vs
//   9:05 reported during pause/resume + extend). Root cause: timer:sync
//   interval was 5s, giving visible local-tick drift between host and
//   participants between syncs. Fix: tighten to 2s.
//
//   Bug 9 — "Another Round" skipped the Match People → preview → confirm
//   flow and dumped participants straight into a new breakout. Root
//   cause: HostControls emitted host:start_round directly. Fix: emit
//   host:generate_matches instead; server accepts CLOSING_LOBBY and
//   transitions the session back to ROUND_TRANSITION + bumps round cap.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(relPath: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, relPath), 'utf8');
}

describe('Dr Arch April 19 — Bug 6: LiveKit CSS override for object-contain', () => {
  it('client/src/index.css overrides .lk-participant-media-video object-fit', () => {
    const css = nodeFs.readFileSync(
      nodePath.join(__dirname, '../../../../../client/src/index.css'),
      'utf8',
    );
    // The override must target the LiveKit class with !important so it
    // beats the vendor stylesheet specificity.
    expect(css).toMatch(/\.lk-participant-media-video\s*\{[\s\S]*?object-fit:\s*contain\s*!important/);
  });
});

describe('Dr Arch April 19 — Bug 7: Manual breakout rejects participants in active rooms', () => {
  it('breakout-bulk rejects with PARTICIPANT_IN_ACTIVE_ROOM when participant is in active match', () => {
    const src = readSource('../../../services/orchestration/handlers/breakout-bulk.ts');
    // Pre-insertion SELECT to detect conflicts
    expect(src).toMatch(/status\s*=\s*'active'[\s\S]*?participant_a_id\s*=\s*u\.id/);
    // Error code the client should handle
    expect(src).toMatch(/PARTICIPANT_IN_ACTIVE_ROOM/);
    // Must return before the reassign loop (no silent yanking)
    const handlerStart = src.indexOf('handleHostCreateBreakoutBulk');
    expect(handlerStart).toBeGreaterThan(-1);
    const handlerEnd = src.indexOf('export async function handleHostExtendBreakoutAll');
    const handler = src.slice(handlerStart, handlerEnd);
    // Rejection path must come BEFORE the "Reassign any existing active matches" loop.
    const rejectIdx = handler.indexOf('PARTICIPANT_IN_ACTIVE_ROOM');
    const reassignIdx = handler.indexOf('Reassign any existing active matches');
    expect(rejectIdx).toBeGreaterThan(-1);
    expect(reassignIdx).toBeGreaterThan(-1);
    expect(rejectIdx).toBeLessThan(reassignIdx);
  });

  it('HostControls modal disables checkbox for participants already in an active room', () => {
    const src = readSource('../../../../../client/src/features/live/HostControls.tsx');
    // The new disable computation includes inActiveRoom.
    expect(src).toMatch(/checkboxDisabled\s*=\s*[^;]*inActiveRoom/);
    // Checkbox uses that computed disabled value.
    expect(src).toMatch(/disabled=\{checkboxDisabled\}/);
    // Modal has the explainer banner.
    expect(src).toMatch(/finish or leave their current room/i);
  });
});

describe('Dr Arch April 19 — Bug 8: Tighter timer sync interval (5s → 2s)', () => {
  it('startSegmentTimer sync interval fires every 2s (was 5s)', () => {
    const src = readSource('../../../services/orchestration/handlers/timer-manager.ts');
    // Find the syncInterval setInterval call.
    const syncBlock = src.match(/setInterval\([\s\S]*?timer:sync[\s\S]*?\}, (\d+)\)/);
    expect(syncBlock).not.toBeNull();
    expect(syncBlock![1]).toBe('2000');
  });
});

describe('Dr Arch April 19 — Bug 9: "Another Round" routes through Match People flow', () => {
  it('HostControls "Another Round" button emits host:generate_matches (not host:start_round)', () => {
    const src = readSource('../../../../../client/src/features/live/HostControls.tsx');
    // Locate the actual JSX button (not the comment above it) via the
    // Shuffle icon + label on the same line.
    const labelMatch = src.match(/<Shuffle[^>]*\/>\s*Another Round/);
    expect(labelMatch).not.toBeNull();
    const labelIdx = src.indexOf(labelMatch![0]);
    expect(labelIdx).toBeGreaterThan(-1);
    // Look ~1500 chars BEFORE the label — the onClick handler is above it.
    const block = src.slice(Math.max(0, labelIdx - 1500), labelIdx + 100);
    expect(block).toMatch(/host:generate_matches/);
    // Must NOT emit host:start_round in this handler.
    expect(block).not.toMatch(/socket\?\.emit\(['"]host:start_round/);
  });

  it('handleHostGenerateMatches accepts CLOSING_LOBBY state', () => {
    const src = readSource('../../../services/orchestration/handlers/matching-flow.ts');
    const handlerStart = src.indexOf('export async function handleHostGenerateMatches');
    expect(handlerStart).toBeGreaterThan(-1);
    const handler = src.slice(handlerStart, handlerStart + 3000);
    // State guard now includes CLOSING_LOBBY
    expect(handler).toMatch(/SessionStatus\.CLOSING_LOBBY/);
    // Transition back to ROUND_TRANSITION when entering from CLOSING_LOBBY
    expect(handler).toMatch(/CLOSING_LOBBY[\s\S]*?ROUND_TRANSITION/);
    // Bump numberOfRounds so the new round is a valid round N+1
    expect(handler).toMatch(/numberOfRounds[\s\S]*?\+\s*1/);
    // Cancel the closing-lobby safety timer
    expect(handler).toMatch(/clearSessionTimers/);
  });
});
