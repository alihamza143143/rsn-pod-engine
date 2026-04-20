// Tier-1 A6 — Socket.IO transport pinning + pingTimeout + rate-limit exemption
//
// Three changes to reduce churn at 200 concurrent users:
//
//   1. Transport pinned to WebSocket by default. Polling fallback was a
//      foot-gun: corporate proxies that block WS silently degraded to
//      ~6 HTTP req/min per client, which hit the 100/min limiter and
//      locked users out. Override with SOCKET_IO_TRANSPORTS env.
//
//   2. pingTimeout bumped 30_000 → 45_000 for mobile tolerance (iOS
//      Safari backgrounds tabs >30 s, triggering churn in disconnect
//      timeout + auto-reassign flows).
//
//   3. /socket.io/* stays outside the global /api rate limiter. Belt-
//      and-braces for edge cases where polling is re-enabled via env.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readSource(relPath: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, relPath), 'utf8');
}

describe('Tier-1 A6 — Socket.IO transport + timing config', () => {
  const src = readSource('../../index.ts');

  describe('transports default to WebSocket only', () => {
    it('reads SOCKET_IO_TRANSPORTS env with fallback to [\'websocket\']', () => {
      expect(src).toMatch(/SOCKET_IO_TRANSPORTS\s*=\s*\(process\.env\.SOCKET_IO_TRANSPORTS\?\.split\(','\)/);
      expect(src).toMatch(/\|\|\s*\['websocket'\]/);
    });

    it('passes transports option to SocketServer constructor', () => {
      const ctorStart = src.indexOf('new SocketServer(server, {');
      const ctorEnd = src.indexOf('});', ctorStart);
      const ctor = src.slice(ctorStart, ctorEnd);
      expect(ctor).toMatch(/transports:\s*SOCKET_IO_TRANSPORTS/);
    });
  });

  describe('pingTimeout is bumped to 45 seconds', () => {
    it('SocketServer uses pingTimeout: 45_000', () => {
      expect(src).toMatch(/pingTimeout:\s*45_000/);
      // Old value must be gone
      expect(src).not.toMatch(/pingTimeout:\s*30_000/);
    });

    it('pingInterval stays at 10 s (default healthy for active clients)', () => {
      expect(src).toMatch(/pingInterval:\s*10_000/);
    });
  });

  describe('rate limiter remains scoped to /api only', () => {
    it('apiLimiter is mounted at /api (not globally) and not under /socket.io', () => {
      expect(src).toMatch(/app\.use\('\/api',\s*apiLimiter\)/);
      expect(src).not.toMatch(/app\.use\('\/socket\.io',\s*apiLimiter\)/);
      expect(src).not.toMatch(/app\.use\(apiLimiter\)/);
    });
  });
});
