// Phase F — verify items 15 (stats dedup) and 16 (no-repeat matching).
//
// The 10 May audit revealed that both of these are already correctly
// implemented. This file pins the architectural invariants so they can
// never silently regress: the kind of guard that would have caught the
// pre-Phase-2 stats-by-display-name bug, or anyone removing the
// usedPairs check from the matching engine.

import * as nodeFs from 'fs';
import * as nodePath from 'path';
import { MatchingEngineV1 } from '../../services/matching/matching.engine';
import type { MatchingInput, MatchingParticipant } from '@rsn/shared';

function readSource(rel: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, '../../', rel), 'utf8');
}

describe('Phase F — stats dedup + no-repeat matching invariants', () => {
  describe('Item 15 — meeting-records stats group by partner_id (UUID), never display name', () => {
    const src = readSource('services/meeting-records/meeting-records.service.ts');

    it('getUniquePeopleMet uses COUNT(DISTINCT partner_id)', () => {
      const fnStart = src.indexOf('export async function getUniquePeopleMet');
      expect(fnStart).toBeGreaterThan(-1);
      const fnEnd = src.indexOf('\nexport ', fnStart + 1);
      const fn = src.slice(fnStart, fnEnd > -1 ? fnEnd : src.length);
      expect(fn).toMatch(/COUNT\(DISTINCT\s+partner_id\)/i);
      // Forbid grouping by display_name or any name-derived column — the
      // bug Stefan reported pre-Phase-2 was duplicate names producing
      // duplicate rows in stats.
      expect(fn).not.toMatch(/COUNT\(DISTINCT\s+display_name\)/i);
      expect(fn).not.toMatch(/GROUP\s+BY\s+display_name/i);
    });

    it('getMeetingCounts also dedupes via partner_id UUID', () => {
      const fnStart = src.indexOf('export async function getMeetingCounts');
      expect(fnStart).toBeGreaterThan(-1);
      const fnEnd = src.indexOf('\nexport ', fnStart + 1);
      const fn = src.slice(fnStart, fnEnd > -1 ? fnEnd : src.length);
      expect(fn).toMatch(/COUNT\(DISTINCT\s+partner_id\)/i);
    });

    it('schema column partner_id is a UUID foreign key (not a name string)', () => {
      // The migration that created meeting_records must declare partner_id
      // as a UUID. If anyone changes this to a name field, the dedup falls
      // apart silently — pin the column type.
      const migration = readSource('db/migrations/054_meeting_records.sql');
      expect(migration).toMatch(/partner_id\s+UUID/i);
    });
  });

  describe('Item 16 — matching engine never re-pairs the same two users in the same session', () => {
    const engineSrc = readSource('services/matching/matching.engine.ts');

    it('engine builds usedPairs from previousRounds and skips already-paired keys', () => {
      // Pin the structural invariant: usedPairs is seeded from previousRounds
      // (so cross-round repeats are caught) AND newly generated pairs are
      // added back to usedPairs (so within-batch repeats are also caught).
      expect(engineSrc).toMatch(/const\s+usedPairs\s*=\s*new\s+Set/);
      expect(engineSrc).toMatch(/for\s*\(\s*const\s+round\s+of\s+previousRounds\s*\)/);
      expect(engineSrc).toMatch(/usedPairs\.add\(pairKey\(/);
    });

    it('a 4-person 3-round generation never repeats any pair', async () => {
      // Behavioural test — the strongest kind of guard. If anyone removes
      // the usedPairs check or seeds it incorrectly, this test fails with
      // a duplicate-pair message.
      const participants: MatchingParticipant[] = ['u1', 'u2', 'u3', 'u4'].map(id => ({
        userId: id,
        interests: [],
        reasonsToConnect: [],
        industry: null,
        company: null,
        languages: [],
        timezone: null,
        attributes: {},
        isPremium: false,
      } as unknown as MatchingParticipant));
      const input: MatchingInput = {
        sessionId: 's-test',
        participants,
        config: {
          numberOfRounds: 3,
          algorithm: 'speed_networking_v1',
          weights: {},
          hardConstraints: [],
        } as any,
        encounterHistory: [],
        previousRounds: [],
      };
      const engine = new MatchingEngineV1();
      const out = await engine.generateSchedule(input);
      const seen = new Set<string>();
      for (const round of out.rounds) {
        for (const pair of round.pairs) {
          // Sort the pair so (u1,u2) and (u2,u1) collide.
          const key = [pair.participantAId, pair.participantBId].sort().join('|');
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    });
  });
});
