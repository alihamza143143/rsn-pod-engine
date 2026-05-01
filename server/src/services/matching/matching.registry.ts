// ─── Matching Engine Registry ────────────────────────────────────────────────
//
// Phase 3 (1 May 2026 spec) — pluggable matching algorithms.
//
// Stefan's strategic note: "the matching engine 1.0 spec that you already
// have in mind ... this is not the only matching algorithm for the system.
// You can say it like this is one of many. So the system has custom and
// multiple matching logics and matching algorithms. Speed networking events
// use Engine 1.0; other event types will use other engines."
//
// Pre-Phase-3, matching.service.ts imported the concrete singleton:
//   import { matchingEngine } from './matching.engine'
// Adding a second algorithm meant editing every call site.
//
// Phase 3 introduces a registry: `Map<engineId, IMatchingEngine>`. New event
// types pick a different engineId via `sessions.matching_algorithm_id` and
// register their own implementation against this enum. Engine V1 stays as
// the default ('speed_networking_v1'), self-registers on import.
//
// This is purely the SEAM — Engine V1.0 algorithm itself stays identical.
// Stefan's full Matching Engine 1.0 redesign lands later through this seam.
//
// Forward compat: when a future event type registers
// 'roundtable_v1' or 'mentorship_v1', no orchestration code changes — they
// just call getMatchingEngine(session.matching_algorithm_id).

import { IMatchingEngine } from './matching.interface';
import { matchingEngine as engineV1 } from './matching.engine';
import logger from '../../config/logger';

/**
 * Canonical engine identifiers. Add new entries here when a new engine
 * implementation lands.
 */
export const ENGINE_IDS = {
  SPEED_NETWORKING_V1: 'speed_networking_v1',
} as const;

export type EngineId = typeof ENGINE_IDS[keyof typeof ENGINE_IDS] | string;

/** Default engine used when a session has no matching_algorithm_id set. */
export const DEFAULT_ENGINE_ID: EngineId = ENGINE_IDS.SPEED_NETWORKING_V1;

const registry = new Map<string, IMatchingEngine>();

/**
 * Register an engine implementation under an ID. Idempotent — re-registering
 * the same ID overwrites (useful for tests).
 */
export function registerEngine(id: string, engine: IMatchingEngine): void {
  registry.set(id, engine);
  logger.info({ engineId: id }, 'Matching engine registered');
}

/**
 * Look up an engine. Falls back to DEFAULT_ENGINE_ID if the requested ID
 * isn't registered (with a warning) so unknown algorithm IDs don't crash
 * mid-event.
 */
export function getMatchingEngine(id?: string | null): IMatchingEngine {
  const lookupId = id || DEFAULT_ENGINE_ID;
  const engine = registry.get(lookupId);
  if (engine) return engine;

  if (id && id !== DEFAULT_ENGINE_ID) {
    logger.warn({ requestedId: id, fallbackId: DEFAULT_ENGINE_ID },
      'Unknown matching engine ID — falling back to default');
  }

  const fallback = registry.get(DEFAULT_ENGINE_ID);
  if (!fallback) {
    throw new Error(`No matching engine registered (looked up: '${lookupId}', default: '${DEFAULT_ENGINE_ID}')`);
  }
  return fallback;
}

/** List registered engine IDs (for diagnostics + admin UI). */
export function listEngines(): string[] {
  return [...registry.keys()];
}

// ─── Self-Registration ──────────────────────────────────────────────────────
// Engine V1 is the speed-networking engine. Other engines should self-register
// the same way when they are added to the codebase.
registerEngine(ENGINE_IDS.SPEED_NETWORKING_V1, engineV1);
