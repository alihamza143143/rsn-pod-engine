// ─── Rate Limiting Middleware ─────────────────────────────────────────────────
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import config from '../config';
import logger from '../config/logger';
import { getRedisClient } from '../services/redis/redis.client';
import { ApiResponse } from '@rsn/shared';

/**
 * Tier-1 A7 — optional Redis-backed store factory.
 *
 * Builds a RedisStore when RATE_LIMIT_STORE=redis AND Redis is healthy at
 * request time, else falls back to express-rate-limit's default MemoryStore
 * (current behaviour). This matters once we scale past 1 Render instance:
 * each instance currently has its own in-process counter, so N instances
 * allow N× the stated quota. With Redis-backed counters the quota applies
 * globally.
 *
 * Defaults to in-memory for Tier-1 safety — a misconfigured Redis would
 * otherwise degrade every request in the app. Flip the env to enable once
 * multi-instance rollout is ready.
 */
function buildStore(prefix: string): RateLimitOptions['store'] | undefined {
  if (process.env.RATE_LIMIT_STORE !== 'redis') return undefined;
  // Redis is initialised inside start() AFTER this module evaluates, so we
  // cannot grab the client here. Instead the store resolves Redis at each
  // request via sendCommand. If Redis is unavailable at request time the
  // throw bubbles into express-rate-limit, which fails open — the request
  // proceeds without rate-limit accounting, which is the safer failure
  // mode than blocking every request.
  try {
    return new RedisStore({
      prefix: `rsn:ratelimit:${prefix}:`,
      sendCommand: (...args: string[]) => {
        const redis = getRedisClient();
        if (!redis) throw new Error('Redis unavailable at request time');
        return (redis.call as any)(...args);
      },
    });
  } catch (err) {
    logger.warn({ err, prefix }, 'Failed to initialise Redis rate-limit store — using in-memory');
    return undefined;
  }
}

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('api'),
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    };
    res.status(429).json(response);
  },
});

/**
 * Strict rate limiter for auth endpoints (magic link, verify)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.env === 'development' ? 100 : 50, // 50 requests per 15 min in production
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // count all requests
  store: buildStore('auth'),
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      },
    };
    res.status(429).json(response);
  },
});

/**
 * Invite endpoint rate limiter
 */
export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,                   // 50 invites per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('invite'),
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Invite limit reached. Please try again later.',
      },
    };
    res.status(429).json(response);
  },
});
