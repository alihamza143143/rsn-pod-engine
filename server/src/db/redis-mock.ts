// ─── In-Memory Redis Mock ────────────────────────────────────────────────────
// Drop-in replacement for ioredis when REDIS_URL is not available.
// Provides basic key-value operations with TTL support.
// Used for local development and testing.

import logger from '../config/logger';

interface StoreEntry {
  value: string;
  expiresAt: number | null; // epoch ms, null = no expiry
}

class RedisMock {
  private store = new Map<string, StoreEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Periodic cleanup of expired keys every 30s
    this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
    logger.info('[RedisMock] In-memory Redis mock initialised');
  }

  private isExpired(entry: StoreEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  private cleanup(): void {
    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | null = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return -2; // key does not exist
    if (entry.expiresAt === null) return -1; // no expiry
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const result: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (!this.isExpired(entry) && regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && !this.isExpired(entry)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry && !this.isExpired(entry) ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
    return next;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
}

// Export singleton
export const redisMock = new RedisMock();
export default redisMock;
