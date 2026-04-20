// Tier-1 A7 — Redis-backed rate-limit store (feature-flagged)
//
// Default is in-memory (current behaviour). Set RATE_LIMIT_STORE=redis to
// opt-in to the shared Redis-backed store. This matters once we scale past
// 1 Render instance: in-memory counters are per-process so 2 instances
// allow 2× the stated quota. Redis-backed counters apply globally.
//
// Safety: if Redis is unavailable at request time, sendCommand throws and
// express-rate-limit fails open (request proceeds without limit
// accounting). That's preferable to blocking every request.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(relPath: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, relPath), 'utf8');
}

describe('Tier-1 A7 — Redis-backed rate-limit store', () => {
  const src = readSource('../../middleware/rateLimit.ts');

  describe('RedisStore is wired behind RATE_LIMIT_STORE=redis flag', () => {
    it('imports RedisStore from rate-limit-redis', () => {
      expect(src).toMatch(/import RedisStore from 'rate-limit-redis'/);
    });

    it('buildStore helper gates on RATE_LIMIT_STORE env var', () => {
      expect(src).toMatch(/process\.env\.RATE_LIMIT_STORE\s*!==\s*'redis'/);
    });

    it('buildStore defers Redis lookup to per-request sendCommand', () => {
      const fnStart = src.indexOf('function buildStore(');
      const fnEnd = src.indexOf('\n}\n', fnStart);
      const fn = src.slice(fnStart, fnEnd);
      expect(fn).toMatch(/sendCommand:\s*\([\s\S]*?args[\s\S]*?\)\s*=>/);
      // The Redis client is fetched inside sendCommand, not at module load
      expect(fn).toMatch(/const redis = getRedisClient\(\)/);
      // Unavailable Redis throws — express-rate-limit fails open
      expect(fn).toMatch(/throw new Error\('Redis unavailable at request time'\)/);
    });

    it('prefixes Redis keys with rsn:ratelimit:{scope}:', () => {
      expect(src).toMatch(/prefix:\s*`rsn:ratelimit:\$\{prefix\}:`/);
    });
  });

  describe('all three limiters opt into the hybrid store via buildStore', () => {
    it('apiLimiter uses buildStore(\'api\')', () => {
      const block = src.slice(src.indexOf('export const apiLimiter'), src.indexOf('export const authLimiter'));
      expect(block).toMatch(/store:\s*buildStore\('api'\)/);
    });

    it('authLimiter uses buildStore(\'auth\')', () => {
      const block = src.slice(src.indexOf('export const authLimiter'), src.indexOf('export const inviteLimiter'));
      expect(block).toMatch(/store:\s*buildStore\('auth'\)/);
    });

    it('inviteLimiter uses buildStore(\'invite\')', () => {
      const block = src.slice(src.indexOf('export const inviteLimiter'));
      expect(block).toMatch(/store:\s*buildStore\('invite'\)/);
    });
  });

  describe('package.json declares the dependency', () => {
    it('rate-limit-redis is in dependencies', () => {
      const pkg = nodeFs.readFileSync(nodePath.join(__dirname, '../../../package.json'), 'utf8');
      const deps = JSON.parse(pkg).dependencies;
      expect(deps['rate-limit-redis']).toBeDefined();
    });
  });
});
