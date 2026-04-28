// T1-6 — Encounter history session-scoped query + crossEventMemory flag (Issue 11)
//
// Pre-fix: getEncounterHistoryForUsers pulled ALL encounters across ALL events.
// This means a pair who met in Event A would be penalised as "already met"
// in Event B even though they hadn't met in Event B yet. Plus when round 2
// matching ran in the same session, encounters from round 1 (just written
// to encounter_history) double-counted alongside the engine's `usedPairs` Set.
//
// Post-fix:
//   - Optional `sessionId` parameter — when provided, encounters whose
//     last_session_id matches it are filtered out (within-session uniqueness
//     stays in `usedPairs`, cross-event memory stays accurate)
//   - Optional `crossEventMemory` parameter — when false, returns empty
//     list (every pair treated as a first meeting). Pod owners can opt
//     out for repeat-attendance pods. Default true.
//
// Phase 4 (29 April 2026 spec) — superseded by `matchingPolicy` (three
// options: platform_wide / within_event / none). The `crossEventMemory`
// flag still works for backwards compatibility via resolveMatchingPolicy
// — these tests now pin both API surfaces.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../services/matching/matching.service.ts'),
    'utf8',
  );
}

describe('T1-6 — getEncounterHistoryForUsers scope + flag', () => {
  const src = readSource();

  describe('signature widened to accept options', () => {
    it('signature accepts userIds + options (sessionId, crossEventMemory, matchingPolicy)', () => {
      // Phase 4: signature now also accepts matchingPolicy. The shape stays
      // backwards-compatible with T1-6's original (sessionId, crossEventMemory).
      expect(src).toMatch(/async function getEncounterHistoryForUsers\(\s*userIds:\s*string\[\],\s*options:\s*\{[\s\S]+?sessionId\?:\s*string;[\s\S]+?crossEventMemory\?:\s*boolean;[\s\S]+?matchingPolicy\?:\s*MatchingPolicy;?[\s\S]*?\}\s*=\s*\{\}/);
    });
  });

  describe('crossEventMemory=false routes through resolveMatchingPolicy → none → empty', () => {
    it('the legacy crossEventMemory=false flag still produces empty results', () => {
      // Phase 4: the helper resolves the effective policy from either
      // matchingPolicy OR crossEventMemory (legacy fallback). Both
      // 'within_event' and 'none' return empty.
      expect(src).toMatch(/policy\s*===\s*['"]within_event['"]\s*\|\|\s*policy\s*===\s*['"]none['"][\s\S]*?return \[\]/);
      // The legacy flag is still honored:
      expect(src).toMatch(/crossEventMemory\s*===\s*false[\s\S]*?['"]none['"]/);
    });
  });

  describe('sessionId scoping', () => {
    it('appends "AND last_session_id != $N" to the WHERE clause when sessionId is set', () => {
      const fnStart = src.indexOf('async function getEncounterHistoryForUsers');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/last_session_id IS NULL OR last_session_id != \$2/);
    });

    it('omits the extra clause when sessionId is not provided (back-compat)', () => {
      const fnStart = src.indexOf('async function getEncounterHistoryForUsers');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/let extraWhere = ['"]['"]/);
      expect(fn).toMatch(/if \(options\.sessionId\)/);
    });
  });

  describe('callers route sessionConfig through resolveMatchingPolicy (Phase 4)', () => {
    it('generateSessionSchedule passes matchingPolicy to the helper', () => {
      const fnStart = src.indexOf('export async function generateSessionSchedule');
      const fnEnd = src.indexOf('\nexport ', fnStart + 1);
      const fn = src.slice(fnStart, fnEnd);
      // Phase 4: callers compute policy via resolveMatchingPolicy and pass it
      // to the helper. The legacy crossEventMemory flag is still honored
      // inside resolveMatchingPolicy for backwards compat.
      expect(fn).toMatch(/resolveMatchingPolicy\(sessionConfig\)/);
      expect(fn).toMatch(/getEncounterHistoryForUsers\(userIds,\s*\{[\s\S]+?matchingPolicy[\s\S]*?\}\)/);
    });

    it('generateSingleRound passes matchingPolicy to the helper', () => {
      const fnStart = src.indexOf('export async function generateSingleRound');
      const fnEnd = src.indexOf('\nexport ', fnStart + 1);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/resolveMatchingPolicy\(sessionConfig\)/);
      expect(fn).toMatch(/getEncounterHistoryForUsers\(userIds,\s*\{[\s\S]+?matchingPolicy[\s\S]*?\}\)/);
    });
  });

  describe('default behavior preserved (no options = old behavior)', () => {
    it('legacy crossEventMemory check still present in helper for backwards compat', () => {
      // resolveMatchingPolicy maps crossEventMemory: false → policy='none'
      // (which then short-circuits to empty in getEncounterHistoryForUsers).
      // We pin that the legacy flag is still honored.
      expect(src).toMatch(/crossEventMemory\s*===\s*false/);
    });
  });
});
