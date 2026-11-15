import { createHash } from 'node:crypto';

/**
 * In-memory fixed-window rate limiter. Sufficient for a single Node instance;
 * when scaling out to several instances, put the limit in the reverse proxy
 * or a shared store (see README → Beveiliging).
 * IP addresses are hashed and never logged or persisted.
 */
interface Bucket { count: number; reset: number }
const buckets = new Map<string, Bucket>();

export interface Limit { key: string; max: number; windowMs: number }

export function hashIp(ip: string) {
  return createHash('sha256').update(`kre:${ip}`).digest('base64url').slice(0, 22);
}

/** Returns seconds until retry when the limit is exceeded, otherwise 0. Counts the hit. */
export function hit({ key, max, windowMs }: Limit, now = Date.now()): number {
  if (buckets.size > 50_000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return 0; }
  b.count++;
  return b.count > max ? Math.ceil((b.reset - now) / 1000) : 0;
}

export function resetRateLimits() { buckets.clear(); }

// Periodic cleanup, only in Node: Cloudflare Workers forbid timers in the global scope
// (there an isolate is short-lived and the size check in hit() is enough).
if (globalThis.navigator?.userAgent !== 'Cloudflare-Workers') {
  setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 10 * 60 * 1000).unref();
}
