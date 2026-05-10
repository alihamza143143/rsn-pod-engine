// Phase E — video layout (10 May review item 12).
//
// Pins the architectural rule: on desktop in a breakout room, remote
// partner(s) take the main stage; the local participant ("You") is a
// PIP (picture-in-picture) in the corner — same Google Meet / FaceTime
// pattern the mobile layout already uses. Pre-fix the desktop layout
// placed the self tile alongside the remote tile(s) in an equal-size
// grid, so users perceived themselves as the big tile (Stefan #12).
//
// The pinned-tile branch is unchanged — clicking any tile (including
// the self PIP) still pins it large.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readClient(rel: string): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../../client/src', rel),
    'utf8',
  );
}

describe('Phase E — desktop video layout: partner big, self PIP', () => {
  const src = readClient('features/live/VideoRoom.tsx');

  it('removes the equal-grid self tile from the unpinned desktop layout', () => {
    // Pre-fix the unpinned desktop branch contained both remote AND local
    // tiles in the same grid with the local tile annotated `data-self`.
    // Now the grid only renders remote tracks; the self tile is rendered
    // separately as a PIP outside the grid.
    // Find the unpinned desktop block (between mobile 1:1 and mobile trio).
    const blockStart = src.indexOf('hidden md:block h-full');
    expect(blockStart).toBeGreaterThan(-1);
    // Take a slice large enough to cover the block (roughly 4KB).
    const block = src.slice(blockStart, blockStart + 4000);
    // Self tile MUST be a PIP (absolute positioned), not a grid cell.
    expect(block).toMatch(/data-self="true"[\s\S]*?absolute[\s\S]*?VideoTile[^>]*label="You"/);
    // The pre-fix grid rendered the self tile inside `hidden md:grid`;
    // that container should no longer carry the self tile.
    const gridSnippets = block.match(/hidden md:grid[\s\S]*?<\/div>/g) || [];
    for (const g of gridSnippets) {
      expect(g).not.toMatch(/label="You"/);
    }
  });

  it('self tile is positioned as a PIP (absolute, top-right) on desktop', () => {
    const blockStart = src.indexOf('hidden md:block h-full');
    const block = src.slice(blockStart, blockStart + 4000);
    expect(block).toMatch(/absolute\s+top-3\s+right-3[^"]*[\s\S]*?VideoTile[^>]*label="You"/);
  });

  it('keeps the existing pinned-tile branch (click any tile to pin large)', () => {
    // The pinned branch is the way users get a "big self" view on demand.
    // Confirm it still exists.
    expect(src).toMatch(/if\s*\(pinnedTile\)/);
    expect(src).toMatch(/setPinnedSid\(t\.sid\)/);
  });

  it('mobile 1:1 + mobile trio layouts are unchanged (partner big, self PIP)', () => {
    // Sanity check that the mobile layouts still exist with their PIP
    // patterns. These were correct pre-fix and the change didn't touch them.
    expect(src).toMatch(/md:hidden[\s\S]*?absolute\s+top-3\s+right-3[\s\S]*?label="You"/);
  });
});
