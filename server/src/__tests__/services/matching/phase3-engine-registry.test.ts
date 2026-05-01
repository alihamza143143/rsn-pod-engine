// Phase 3 (1 May 2026 spec) — pluggable matching engine registry
//
// Stefan: "the matching engine 1.0 spec ... this is not the only matching
// algorithm for the system. The system has custom and multiple matching
// logics. Speed networking events use Engine 1.0; other event types use
// other engines."
//
// Pre-Phase-3, matching.service.ts imported the concrete singleton:
//   import { matchingEngine } from './matching.engine'
// Adding a second engine meant editing every call site.
//
// Phase 3 introduces a registry: Map<engineId, IMatchingEngine>. New event
// types pick a different engineId via session.config.matchingAlgorithmId
// and register their own implementation. Engine V1 stays as the default
// ('speed_networking_v1'), self-registers on import.
//
// Tests pin the architecture; they do NOT change matching algorithm
// behaviour (Engine V1 stays identical).

import * as fs from 'fs';
import * as path from 'path';

function readServer(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../', rel), 'utf8');
}

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '../../../../../', rel), 'utf8');
}

describe('Phase 3 — matching engine registry seam', () => {
  describe('matching.registry.ts surface', () => {
    const src = readServer('services/matching/matching.registry.ts');

    it('exports registerEngine(id, engine)', () => {
      expect(src).toMatch(/export function registerEngine\(/);
    });

    it('exports getMatchingEngine(id?) with fallback to default', () => {
      expect(src).toMatch(/export function getMatchingEngine\(/);
    });

    it('exports listEngines() for admin diagnostics', () => {
      expect(src).toMatch(/export function listEngines\(/);
    });

    it('declares ENGINE_IDS.SPEED_NETWORKING_V1 as the canonical default', () => {
      expect(src).toMatch(/SPEED_NETWORKING_V1:\s*['"]speed_networking_v1['"]/);
    });

    it('declares DEFAULT_ENGINE_ID = speed_networking_v1', () => {
      expect(src).toMatch(/DEFAULT_ENGINE_ID[^=]*=\s*ENGINE_IDS\.SPEED_NETWORKING_V1/);
    });

    it('Engine V1 self-registers on module import', () => {
      expect(src).toMatch(/registerEngine\(ENGINE_IDS\.SPEED_NETWORKING_V1, engineV1\)/);
    });

    it('falls back to DEFAULT when an unknown ID is requested (warns)', () => {
      const fnStart = src.indexOf('export function getMatchingEngine(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/Unknown matching engine ID/);
      expect(fn).toMatch(/DEFAULT_ENGINE_ID/);
    });
  });

  describe('matching.service.ts uses the registry instead of the singleton', () => {
    const src = readServer('services/matching/matching.service.ts');

    it('imports getMatchingEngine + DEFAULT_ENGINE_ID from the registry', () => {
      expect(src).toMatch(/import \{ getMatchingEngine, DEFAULT_ENGINE_ID \} from ['"]\.\/matching\.registry['"]/);
    });

    it('generateSessionSchedule looks up engine via registry, not concrete singleton', () => {
      const fnStart = src.indexOf('export async function generateSessionSchedule');
      // Or the actual exported function — fall back to broader search.
      const useStart = fnStart >= 0 ? fnStart : src.indexOf('matchingEngine.generateSchedule');
      const sliceEnd = src.indexOf('\n}\n', useStart);
      const slice = src.slice(useStart, sliceEnd);
      expect(slice).toMatch(/getMatchingEngine\(/);
    });

    it('generateSingleRound looks up engine via registry', () => {
      const fnStart = src.indexOf('let round = ');
      const slice = src.slice(Math.max(0, fnStart - 800), fnStart + 200);
      expect(slice).toMatch(/getMatchingEngine\(/);
    });

    it('reads sessionConfig.matchingAlgorithmId for the lookup', () => {
      expect(src).toMatch(/sessionConfig\.matchingAlgorithmId/);
    });
  });

  describe('shared SessionConfig has matchingAlgorithmId', () => {
    const src = readRepo('shared/src/types/session.ts');

    it('declares matchingAlgorithmId as optional string in SessionConfig', () => {
      expect(src).toMatch(/matchingAlgorithmId\?\s*:\s*string/);
    });

    it('DEFAULT_SESSION_CONFIG sets matchingAlgorithmId = speed_networking_v1', () => {
      expect(src).toMatch(/matchingAlgorithmId:\s*['"]speed_networking_v1['"]/);
    });
  });
});
