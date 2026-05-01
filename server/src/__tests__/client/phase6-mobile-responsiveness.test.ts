// Phase 6 (1 May 2026 spec) — mobile responsiveness pass
//
// Stefan items 6 + 7: chat doesn't work on mobile, layout broken, needs
// zooming, no clear structure. Pre-Phase-6 ChatPanel had only 1 responsive
// breakpoint (desktop-first), the input used 14px font (triggers iOS
// auto-zoom on focus), and there was no visual cue that the bottom panel
// is a drawer (vs full-screen).

import * as fs from 'fs';
import * as path from 'path';

function readClient(rel: string): string {
  // __dirname == server/src/__tests__/client. Walk up to repo root then into
  // client/src/<rel>.
  return fs.readFileSync(path.join(__dirname, '../../../../client/src', rel), 'utf8');
}

describe('Phase 6 — mobile responsiveness pass', () => {
  describe('global CSS kills iOS input auto-zoom', () => {
    const css = readClient('index.css');

    it('declares 16px font-size on inputs/textareas/selects below 640px', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*639px\)/);
      expect(css).toMatch(/input:not[\s\S]*?textarea[\s\S]*?select[\s\S]*?font-size:\s*16px/);
    });
  });

  describe('ChatPanel layout adapts to mobile', () => {
    const src = readClient('features/live/ChatPanel.tsx');

    it('shows mobile drag-handle visual cue (sm:hidden)', () => {
      expect(src).toMatch(/sm:hidden[\s\S]*?bg-gray-300\s+rounded-full/);
    });

    it('uses rounded-t-2xl on mobile (drawer feel) and rounded-none on desktop', () => {
      expect(src).toMatch(/rounded-t-2xl\s+sm:rounded-none/);
    });

    it('input uses text-base on mobile, text-sm on desktop (kills iOS zoom)', () => {
      expect(src).toMatch(/text-base\s+sm:text-sm/);
    });

    it('only shows left-border on desktop (sm:border-l)', () => {
      expect(src).toMatch(/sm:border-l\s+border-gray-200/);
    });

    it('shows "temporary" hint on room-scope chat (Stefan: breakout chat unclear purpose)', () => {
      expect(src).toMatch(/temporary[\s\S]+?clears at round end/);
    });
  });
});
