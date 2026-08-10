import "server-only";

/**
 * Per-IP rate limiting for sign-in attempts.
 *
 * Account lockout alone only stops an attacker hammering ONE account — it
 * does nothing against spraying one common password across many accounts, and
 * it lets an attacker lock legitimate staff out on purpose. This caps attempts
 * from a single source regardless of which account is targeted.
 *
 * Storage is in-memory, which on serverless means per-instance: an attacker
 * spread across many cold starts gets more attempts than the nominal limit.
 * That is a real limitation, not a complete control — it raises the cost of
 * casual brute force. For a hard guarantee this needs shared storage
 * (Upstash/Redis, or a Mongo collection with a TTL index); see PENDING.md.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 20;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkLoginRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

/** A successful sign-in clears the caller's budget. */
export function clearLoginRateLimit(key: string): void {
  buckets.delete(key);
}
