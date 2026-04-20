// Tier-1 A5 — /health DB-ping cache + /health/deep bypass
//
// Render probes /health every ~10 s. Pre-fix this ran SELECT 1 six times
// per minute, contributing unnecessary load to the pg pool at baseline.
// Post-fix the result is cached for 30 s; Render still gets a liveness
// signal but we only hit the DB twice per minute. /health/deep is a
// manual-diagnostic endpoint that bypasses the cache.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(relPath: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, relPath), 'utf8');
}

describe('Tier-1 A5 — health endpoint cache + deep probe', () => {
  const src = readSource('../../index.ts');

  describe('/health uses a 30-second cache', () => {
    it('declares HEALTH_CACHE_TTL_MS = 30_000', () => {
      expect(src).toMatch(/HEALTH_CACHE_TTL_MS\s*=\s*30_000/);
    });

    it('maintains a single-cell cache for the last DB-ping result', () => {
      expect(src).toMatch(/let healthCache:\s*\{\s*result:\s*\{\s*ok:\s*boolean;\s*latencyMs:\s*number\s*\};\s*cachedAt:\s*number\s*\}\s*\|\s*null/);
    });

    it('/health handler refreshes the cache only when TTL has passed', () => {
      const handler = src.slice(src.indexOf("app.get('/health',"), src.indexOf("app.get('/health/deep'"));
      expect(handler).toMatch(/now - healthCache\.cachedAt >= HEALTH_CACHE_TTL_MS/);
      // It must NOT call pool.query directly — routes through pingDatabase
      expect(handler).not.toMatch(/pool\.query\('SELECT 1'\)/);
    });

    it('pingDatabase helper centralises the SELECT 1 and latency measurement', () => {
      expect(src).toMatch(/async function pingDatabase\(\):\s*Promise<\{\s*ok:\s*boolean;\s*latencyMs:\s*number\s*\}>/);
      // The helper is the only place that runs SELECT 1
      const matches = src.match(/pool\.query\('SELECT 1'\)/g) || [];
      expect(matches.length).toBe(1);
    });
  });

  describe('/health/deep bypasses the cache', () => {
    it('registers an /health/deep route handler', () => {
      expect(src).toMatch(/app\.get\('\/health\/deep',/);
    });

    it('/health/deep refreshes the shared cache with the fresh result', () => {
      const start = src.indexOf("app.get('/health/deep'");
      const end = src.indexOf('});', start + 1) + 3;
      const handler = src.slice(start, end);
      expect(handler).toMatch(/healthCache\s*=\s*\{/);
    });
  });
});
