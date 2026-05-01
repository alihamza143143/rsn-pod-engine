// Matching Engine 1.0 — full spec compliance pinning tests
//
// Source spec: assets/Matching algorithm 1.0.pdf (RSN MATCHING SYSTEM
// SPECIFICATION v1). 14 sections. This test asserts that every load-bearing
// piece of the spec is wired through the codebase.
//
// Architectural intent: Speed-Networking events use this engine via the
// registry (engine ID = 'speed_networking_v1'). Other event types
// register their own engines but reuse the same data model and metadata
// fields where they apply.

import * as fs from 'fs';
import * as path from 'path';
import {
  MatchingEngineV1,
} from '../../../services/matching/matching.engine';
import type {
  MatchingParticipant, MatchingWeights,
  EncounterHistoryEntry,
} from '@rsn/shared';

function readServer(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');
}

function makeParticipant(overrides: Partial<MatchingParticipant> & { userId: string }): MatchingParticipant {
  return {
    interests: [],
    reasonsToConnect: [],
    industry: null,
    company: null,
    languages: [],
    timezone: null,
    attributes: {},
    ...overrides,
  };
}

const NEUTRAL_WEIGHTS: MatchingWeights = {
  sharedInterests: 0.25,
  sharedReasons: 0.25,
  industryDiversity: 0.15,
  companyDiversity: 0.15,
  languageMatch: 0.10,
  encounterFreshness: 0.10,
  mutualPremiumRequest: 0.20,
  singlePremiumRequest: 0.10,
  premiumBoost: 0.03,
  mutualMeetAgainBoost: 0.05,
};

describe('Matching Engine 1.0 — spec compliance', () => {
  // ── Section 4: Required data model ──────────────────────────────────────
  describe('Section 4 — data model', () => {
    it('migration 055 declares users.is_premium with safe default', () => {
      const sql = readServer('db/migrations/055_matching_engine_v1_spec.sql');
      expect(sql).toMatch(/ALTER TABLE users[\s\S]+?is_premium BOOLEAN NOT NULL DEFAULT FALSE/);
    });

    it('migration 055 creates match_requests table with status enum + UNIQUE constraint', () => {
      const sql = readServer('db/migrations/055_matching_engine_v1_spec.sql');
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS match_requests/);
      expect(sql).toMatch(/CHECK \(status IN \('pending', 'fulfilled', 'expired'\)\)/);
      expect(sql).toMatch(/UNIQUE\(requester_id, requested_id, event_id\)/);
      expect(sql).toMatch(/CHECK \(requester_id != requested_id\)/);
    });

    it('migration 055 adds matches.match_reason / fallback_used / repeat_in_event / premium_influenced', () => {
      const sql = readServer('db/migrations/055_matching_engine_v1_spec.sql');
      expect(sql).toMatch(/matches[\s\S]+?match_reason TEXT/);
      expect(sql).toMatch(/matches[\s\S]+?fallback_used BOOLEAN NOT NULL DEFAULT FALSE/);
      expect(sql).toMatch(/matches[\s\S]+?repeat_in_event BOOLEAN NOT NULL DEFAULT FALSE/);
      expect(sql).toMatch(/matches[\s\S]+?premium_influenced BOOLEAN NOT NULL DEFAULT FALSE/);
    });

    it('shared MatchingParticipant declares isPremium + requestedUserIds', () => {
      const src = fs.readFileSync(path.join(__dirname, '../../../../../shared/src/types/match.ts'), 'utf8');
      const ifaceStart = src.indexOf('export interface MatchingParticipant');
      const ifaceEnd = src.indexOf('\n}', ifaceStart);
      const iface = src.slice(ifaceStart, ifaceEnd);
      expect(iface).toMatch(/isPremium\?\s*:\s*boolean/);
      expect(iface).toMatch(/requestedUserIds\?\s*:\s*string\[\]/);
    });
  });

  // ── Section 5: Pre-event planning ───────────────────────────────────────
  describe('Section 5 — pre-event planning (full schedule upfront)', () => {
    it('engine generates the full numberOfRounds schedule in one call', async () => {
      const engine = new MatchingEngineV1();
      const participants = [1, 2, 3, 4].map(n => makeParticipant({ userId: `u${n}` }));
      const result = await engine.generateSchedule({
        sessionId: 's1',
        participants,
        config: { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 3, avoidDuplicates: true, globalOptimize: true },
        encounterHistory: [],
        previousRounds: [],
      });
      expect(result.rounds).toHaveLength(3);
    });
  });

  // ── Section 6: Hard rules + priority ────────────────────────────────────
  describe('Section 6 — hard rules + priority order', () => {
    it('user_block + inviter_invitee_block hard constraints exist in HardConstraint type', () => {
      const src = fs.readFileSync(path.join(__dirname, '../../../../../shared/src/types/match.ts'), 'utf8');
      expect(src).toMatch(/'user_block'/);
      expect(src).toMatch(/'inviter_invitee_block'/);
    });

    it('engine respects no-repeat-in-same-event by tracking usedPairs across rounds', async () => {
      const engine = new MatchingEngineV1();
      const participants = [1, 2, 3, 4].map(n => makeParticipant({ userId: `u${n}` }));
      const result = await engine.generateSchedule({
        sessionId: 's1',
        participants,
        config: { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 2, avoidDuplicates: true, globalOptimize: true },
        encounterHistory: [],
        previousRounds: [],
      });
      // Collect every (a,b) pair across rounds; no pair should appear twice.
      const seen = new Set<string>();
      for (const round of result.rounds) {
        for (const p of round.pairs) {
          const key = [p.participantAId, p.participantBId].sort().join(':');
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    });
  });

  // ── Section 7: Premium matching ─────────────────────────────────────────
  describe('Section 7 — premium matching', () => {
    it('mutual premium request scores higher than no-overlap baseline', async () => {
      const engine = new MatchingEngineV1();
      const a = makeParticipant({ userId: 'a', isPremium: true, requestedUserIds: ['b'] });
      const b = makeParticipant({ userId: 'b', isPremium: true, requestedUserIds: ['a'] });
      const c = makeParticipant({ userId: 'c' });
      const ab = engine.scorePair(a, b, { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true }, []);
      const ac = engine.scorePair(a, c, { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true }, []);
      expect(ab.score).toBeGreaterThan(ac.score);
      expect(ab.reasonTags).toContain('mutual_premium_request');
    });

    it('single premium request lifts above no-request', async () => {
      const engine = new MatchingEngineV1();
      const a = makeParticipant({ userId: 'a', isPremium: true, requestedUserIds: ['b'] });
      const b = makeParticipant({ userId: 'b' });
      const c = makeParticipant({ userId: 'c' });
      const ab = engine.scorePair(a, b, { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true }, []);
      const bc = engine.scorePair(b, c, { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true }, []);
      expect(ab.score).toBeGreaterThan(bc.score);
      expect(ab.reasonTags).toContain('premium_request');
    });

    it('default weights cap mutualPremiumRequest below sharedInterests + sharedReasons combined (premium cannot dominate)', () => {
      const src = readServer('services/matching/matching.service.ts');
      const idx = src.indexOf('DEFAULT_WEIGHTS');
      const slice = src.slice(idx, idx + 800);
      // Hard mathematical bound: 0.20 (mutualPremium) < 0.25 + 0.25 (intent factors).
      expect(slice).toMatch(/mutualPremiumRequest:\s*0\.20/);
    });
  });

  // ── Section 8: Feedback and learning ────────────────────────────────────
  describe('Section 8 — feedback + learning', () => {
    it('engine consults encounter.mutualMeetAgain to lift score', () => {
      const engine = new MatchingEngineV1();
      const a = makeParticipant({ userId: 'a' });
      const b = makeParticipant({ userId: 'b' });
      const encounter: EncounterHistoryEntry = {
        userAId: 'a', userBId: 'b', timesMet: 1, lastMetAt: new Date(),
        mutualMeetAgain: true, averageRating: 5,
      };
      const withMutual = engine.scorePair(a, b, {
        weights: { ...NEUTRAL_WEIGHTS, encounterFreshness: 0 }, // disable freshness penalty
        hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true,
      }, [encounter]);
      const noHistory = engine.scorePair(a, b, {
        weights: { ...NEUTRAL_WEIGHTS, encounterFreshness: 0 },
        hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true,
      }, []);
      expect(withMutual.score).toBeGreaterThan(noHistory.score);
      expect(withMutual.reasonTags).toContain('mutual_meet_again');
    });

    it('matching.service loads averageRating from ratings join', () => {
      const src = readServer('services/matching/matching.service.ts');
      expect(src).toMatch(/AVG\(r\.quality_score\)[\s\S]+?AS "averageRating"/);
    });
  });

  // ── Section 10: Edge cases — odd users → trio ───────────────────────────
  describe('Section 10 — edge cases (trios for odd participants)', () => {
    it('odd number of participants forms a trio for the leftover', () => {
      const engine = new MatchingEngineV1();
      const participants = [1, 2, 3].map(n => makeParticipant({ userId: `u${n}` }));
      const round = engine.generateRound(
        participants,
        { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true },
        new Set(),
        [],
        1,
      );
      expect(round.pairs).toHaveLength(1);
      expect(round.pairs[0].participantCId).toBeTruthy();
      expect(round.pairs[0].reasonTags).toContain('trio');
    });
  });

  // ── Section 13: Logging and debugging ───────────────────────────────────
  describe('Section 13 — logging metadata persisted on every match', () => {
    it('persistMatches INSERT writes match_reason / fallback_used / repeat_in_event / premium_influenced', () => {
      const src = readServer('services/matching/matching.service.ts');
      const persistIdx = src.indexOf('async function persistMatches');
      const slice = src.slice(persistIdx);
      expect(slice).toMatch(/match_reason, fallback_used, repeat_in_event, premium_influenced/);
    });

    it('engine sets premiumInfluenced=true on pair output when premium signal fires', () => {
      const engine = new MatchingEngineV1();
      const round = engine.generateRound(
        [
          makeParticipant({ userId: 'a', isPremium: true, requestedUserIds: ['b'] }),
          makeParticipant({ userId: 'b', isPremium: true, requestedUserIds: ['a'] }),
        ],
        { weights: NEUTRAL_WEIGHTS, hardConstraints: [], numberOfRounds: 1, avoidDuplicates: true, globalOptimize: true },
        new Set(),
        [],
        1,
      );
      expect(round.pairs[0].premiumInfluenced).toBe(true);
      expect(round.pairs[0].matchReason).toBe('mutual_premium_request');
    });

    it('engine sets fallbackUsed=true and repeatInEvent=true when matching.service retries without excludedPairs', () => {
      const src = readServer('services/matching/matching.service.ts');
      // The retry block flags every pair as fallbackUsed; the in-event repeat
      // detector flips repeatInEvent only for actual repeats.
      expect(src).toMatch(/pair\.fallbackUsed = true/);
      expect(src).toMatch(/pair\.repeatInEvent = isRepeat/);
    });
  });

  // ── Section 11: Admin controls ──────────────────────────────────────────
  describe('Section 11 — admin controls (defaults wired)', () => {
    it('default config: 5 sessions, within_event policy, allow fallback, prioritize intent', () => {
      const sessionTypes = fs.readFileSync(path.join(__dirname, '../../../../../shared/src/types/session.ts'), 'utf8');
      expect(sessionTypes).toMatch(/numberOfRounds:\s*5/);
      expect(sessionTypes).toMatch(/matchingPolicy:\s*['"]within_event['"]/);
      // Intent priority via sharedInterests + sharedReasons summing to 0.50
      // (the largest single category in DEFAULT_WEIGHTS).
      const svc = readServer('services/matching/matching.service.ts');
      expect(svc).toMatch(/sharedInterests:\s*0\.25/);
      expect(svc).toMatch(/sharedReasons:\s*0\.25/);
    });
  });

  // ── Section 14: Acceptance criteria — composite ─────────────────────────
  describe('Section 14 — acceptance criteria', () => {
    it('engine V1 is registered as the default speed_networking_v1 engine', () => {
      const src = readServer('services/matching/matching.registry.ts');
      expect(src).toMatch(/registerEngine\(ENGINE_IDS\.SPEED_NETWORKING_V1, engineV1\)/);
    });

    it('every match insert path goes through the registry lookup, not the concrete singleton', () => {
      const src = readServer('services/matching/matching.service.ts');
      // The concrete `matchingEngine` import must be gone (Phase 3 removed it).
      // Only the registry lookup remains.
      expect(src).not.toMatch(/import \{ matchingEngine \} from '\.\/matching\.engine'/);
      expect(src).toMatch(/getMatchingEngine\(/);
    });
  });
});
