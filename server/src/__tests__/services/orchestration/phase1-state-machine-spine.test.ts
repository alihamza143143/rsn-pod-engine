// Phase 1 (1 May 2026 spec) — Participant State Machine spine
//
// Pre-Phase-1: participant state was split across 4 in-memory maps
// (presenceMap, roomParticipants, manuallyLeftRound, disconnectTimeouts) +
// DB session_participants.status, mutated from 24 scattered call sites.
// No single chokepoint validated transitions. Stefan's 1 May spec called
// this out as the root cause of "Claus appears multiple times", "users in
// main room and breakout simultaneously", "Wazeem missing from matching".
//
// Fix: services/orchestration/state/participant-state-machine.ts owns the
// canonical in-memory state and the single legal mutation path
// (transitionParticipant). sessionService.updateParticipantStatus
// delegates to it when an ActiveSession exists.
//
// Tests pin the architecture: the module exists, the state set is complete,
// the transition table covers Stefan's spec, the chokepoint delegates.

import * as fs from 'fs';
import * as path from 'path';

function readServer(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');
}

describe('Phase 1 — participant state machine spine', () => {
  describe('module exists with the expected API surface', () => {
    const src = readServer('services/orchestration/state/participant-state-machine.ts');

    it('exports ParticipantState enum', () => {
      expect(src).toMatch(/export enum ParticipantState/);
    });

    it('ParticipantState includes Stefan\'s spec states', () => {
      expect(src).toMatch(/NOT_JOINED\s*=\s*'not_joined'/);
      expect(src).toMatch(/REGISTERED\s*=\s*'registered'/);
      expect(src).toMatch(/IN_MAIN_ROOM\s*=\s*'in_main_room'/);
      expect(src).toMatch(/IN_MATCHING\s*=\s*'in_matching'/);
      expect(src).toMatch(/IN_BREAKOUT\s*=\s*'in_breakout'/);
      expect(src).toMatch(/IN_RATING\s*=\s*'in_rating'/);
      // "Finished" in Stefan's spec maps to existing terminal states
      expect(src).toMatch(/LEFT\s*=\s*'left'/);
      expect(src).toMatch(/REMOVED\s*=\s*'removed'/);
      expect(src).toMatch(/NO_SHOW\s*=\s*'no_show'/);
    });

    it('exports transitionParticipant as the single mutation path', () => {
      expect(src).toMatch(/export async function transitionParticipant\(/);
    });

    it('exports getParticipantState for O(1) reads', () => {
      expect(src).toMatch(/export function getParticipantState\(/);
    });

    it('exports liftFromDbStatus for bootstrap from DB rows', () => {
      expect(src).toMatch(/export function liftFromDbStatus\(/);
    });

    it('exports bootstrapStatesFromDb for warming the in-memory map', () => {
      expect(src).toMatch(/export function bootstrapStatesFromDb\(/);
    });
  });

  describe('legal transitions table', () => {
    const src = readServer('services/orchestration/state/participant-state-machine.ts');

    it('REGISTERED can go to IN_MAIN_ROOM', () => {
      const tableStart = src.indexOf('LEGAL_TRANSITIONS');
      const tableEnd = src.indexOf('\n};', tableStart);
      const table = src.slice(tableStart, tableEnd);
      expect(table).toMatch(/REGISTERED\]:\s*\[[^\]]*IN_MAIN_ROOM/);
    });

    it('IN_MAIN_ROOM can go to IN_MATCHING and IN_BREAKOUT', () => {
      const tableStart = src.indexOf('LEGAL_TRANSITIONS');
      const tableEnd = src.indexOf('\n};', tableStart);
      const table = src.slice(tableStart, tableEnd);
      expect(table).toMatch(/IN_MAIN_ROOM\]:\s*\[[^\]]*IN_MATCHING/);
      expect(table).toMatch(/IN_MAIN_ROOM\]:\s*\[[^\]]*IN_BREAKOUT/);
    });

    it('IN_BREAKOUT can go to IN_RATING and back to IN_MAIN_ROOM', () => {
      const tableStart = src.indexOf('LEGAL_TRANSITIONS');
      const tableEnd = src.indexOf('\n};', tableStart);
      const table = src.slice(tableStart, tableEnd);
      expect(table).toMatch(/IN_BREAKOUT\]:\s*\[[^\]]*IN_RATING/);
      expect(table).toMatch(/IN_BREAKOUT\]:\s*\[[^\]]*IN_MAIN_ROOM/);
    });

    it('REMOVED is terminal (empty allowed-next list)', () => {
      const tableStart = src.indexOf('LEGAL_TRANSITIONS');
      const tableEnd = src.indexOf('\n};', tableStart);
      const table = src.slice(tableStart, tableEnd);
      expect(table).toMatch(/REMOVED\]:\s*\[\]/);
    });
  });

  describe('ActiveSession holds the canonical in-memory state map', () => {
    const src = readServer('services/orchestration/state/session-state.ts');

    it('declares participantStates: Map<string, {state, currentRoomId, updatedAt}>', () => {
      expect(src).toMatch(/participantStates\?\s*:\s*Map<string,\s*\{[\s\S]*?state:[\s\S]*?currentRoomId:[\s\S]*?updatedAt:[\s\S]*?\}>/);
    });
  });

  describe('sessionService.updateParticipantStatus delegates to state machine', () => {
    const src = readServer('services/session/session.service.ts');

    it('imports transitionParticipant from the state machine module (dynamic, to avoid circular dep)', () => {
      expect(src).toMatch(/import\(['"]\.\.\/orchestration\/state\/participant-state-machine['"]\)/);
    });

    it('checks activeSessions.has before delegating (legacy fallback for inactive sessions)', () => {
      const fnStart = src.indexOf('export async function updateParticipantStatus(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/activeSessions\.has\(sessionId\)/);
      expect(fn).toMatch(/transitionParticipant\(/);
    });

    it('legacy DB UPDATE path retained for inactive sessions (back-compat)', () => {
      const fnStart = src.indexOf('export async function updateParticipantStatus(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/UPDATE session_participants SET/);
    });
  });

  describe('transitionParticipant mutates in-memory THEN persists DB', () => {
    const src = readServer('services/orchestration/state/participant-state-machine.ts');
    const fnStart = src.indexOf('export async function transitionParticipant(');
    const fnEnd = src.indexOf('\n}\n', fnStart);
    const fn = src.slice(fnStart, fnEnd);

    it('writes to activeSession.participantStates BEFORE DB UPDATE', () => {
      const inMemIdx = fn.indexOf('participantStates.set(userId');
      const dbIdx = fn.indexOf('UPDATE session_participants SET');
      expect(inMemIdx).toBeGreaterThan(-1);
      expect(dbIdx).toBeGreaterThan(-1);
      expect(inMemIdx).toBeLessThan(dbIdx);
    });

    it('rejects illegal transitions with reason ILLEGAL_TRANSITION', () => {
      expect(fn).toMatch(/reason:\s*['"]ILLEGAL_TRANSITION['"]/);
    });

    it('idempotent self-transition is allowed (heartbeat refresh use case)', () => {
      expect(fn).toMatch(/fromState\s*===\s*toState\s*&&\s*allowIdempotent/);
    });
  });

  describe('IN_BREAKOUT state requires currentRoomId', () => {
    const src = readServer('services/orchestration/state/participant-state-machine.ts');

    it('persists currentRoomId on IN_BREAKOUT', () => {
      const fnStart = src.indexOf('export async function transitionParticipant(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/IN_BREAKOUT[\s\S]*?currentRoomId/);
    });

    it('clears currentRoomId on IN_MAIN_ROOM / IN_MATCHING / IN_RATING', () => {
      const fnStart = src.indexOf('export async function transitionParticipant(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/current_room_id = NULL/);
    });
  });
});
