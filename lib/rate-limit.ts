import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding-window rate limiter per user.
 *
 * Limits are per-user, per-endpoint. Window resets after `windowMs`.
 * Works in Vercel serverless (per-invocation, no cross-instance sharing)
 * — good enough for abuse prevention at hackathon scale.
 *
 * For production, swap the Map for Redis/Upstash.
 */

const RATE_LIMITS = {
  "schema-chat": { maxRequests: 20, windowMs: 60_000 },         // 20 req/min
  "generate-docs": { maxRequests: 3, windowMs: 3_600_000 },     // 3 req/hour
  introspect: { maxRequests: 5, windowMs: 3_600_000 },          // 5 req/hour
  query: { maxRequests: 30, windowMs: 60_000 },                 // 30 req/min
} as const;

type RateLimitKey = keyof typeof RATE_LIMITS;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Evict expired buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 300_000);

/**
 * Check rate limit for a user + endpoint.
 * Returns null if allowed, or a 429 Response if exceeded.
 */
export function checkRateLimit(
  userId: string,
  endpoint: RateLimitKey,
): NextResponse | null {
  const config = RATE_LIMITS[endpoint];
  const now = Date.now();
  const key = `${userId}:${endpoint}`;

  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > config.maxRequests) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: retryAfterSec,
        limit: config.maxRequests,
        window:
          config.windowMs >= 3_600_000
            ? `${config.windowMs / 3_600_000} hour`
            : `${config.windowMs / 60_000} min`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  return null;
}
