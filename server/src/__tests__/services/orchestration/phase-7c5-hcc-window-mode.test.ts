// ─── Phase 7C.5 — Host Control Center window mode ──────────────────────────
//
// Architectural pins for the windowed Host Control Center (drag, resize,
// maximize, minimize, persisted position + size on desktop; full-screen
// drawer fallback on mobile).
//
// These are static text pins over the source — they confirm the
// architectural contract the runtime depends on, not full UI behaviour.

import { readFileSync } from 'fs';
import { join } from 'path';

const REPO = join(__dirname, '..', '..', '..', '..', '..');
const HCC_PATH = join(
  REPO,
  'client', 'src', 'features', 'live', 'HostControlCenter.tsx',
);
const PKG_PATH = join(REPO, 'client', 'package.json');

describe('Phase 7C.5 — HCC window mode (architectural pins)', () => {
  test('react-rnd is a client dependency', () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
    expect(pkg.dependencies && pkg.dependencies['react-rnd']).toBeTruthy();
  });

  test('HostControlCenter imports Rnd from react-rnd', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    expect(src).toMatch(/from\s+['"]react-rnd['"]/);
    expect(src).toMatch(/\bRnd\b/);
  });

  test('Window has a drag handle (class "hcc-drag-handle")', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    expect(src).toMatch(/hcc-drag-handle/);
    // The Rnd config must reference the handle by selector
    expect(src).toMatch(/dragHandleClassName=['"]hcc-drag-handle['"]/);
  });

  test('Min / default size constants defined', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    // Min size constants — accept literal numbers or named constants.
    expect(src).toMatch(/HCC_MIN_W\s*=\s*\d{3,}|minWidth=\{?\s*\d{3,}/);
    expect(src).toMatch(/HCC_MIN_H\s*=\s*\d{3,}|minHeight=\{?\s*\d{3,}/);
  });

  test('Position + size persisted via localStorage', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    // Storage key prefix
    expect(src).toMatch(/rsn:hcc-window|HCC_WINDOW_KEY/);
    expect(src).toMatch(/localStorage\.(getItem|setItem)/);
  });

  test('Mobile fallback gates the window mode (< md / 768px)', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    // Accept literal 768 OR a named constant whose value is 768
    expect(src).toMatch(/HCC_DESKTOP_BREAKPOINT_PX\s*=\s*768|matchMedia.*768|window\.innerWidth\s*[<>=]+\s*768/);
  });

  test('Maximize / minimize state machine present', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    expect(src).toMatch(/maximized|isMaximized/);
    expect(src).toMatch(/minimized|isMinimized/);
  });

  test('Title bar has the three window-control buttons (minimize, maximize, close)', () => {
    const src = readFileSync(HCC_PATH, 'utf8');
    // Distinct aria-labels for assistive tech
    expect(src).toMatch(/aria-label=['"]Minimize/);
    expect(src).toMatch(/aria-label=['"]Maximize|aria-label=['"]Restore/);
    expect(src).toMatch(/aria-label=['"]Close/);
  });
});
