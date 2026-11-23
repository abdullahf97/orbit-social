import "server-only";

type Bucket = { count: number; resetAt: number };

/**
 * In-memory fixed-window limiter.
 *
 * Good enough to stop accidental double submits and naive credential stuffing
 * against a single instance. On serverless this is best-effort (each instance
 * has its own memory) — a production deployment with real traffic should swap
 * this for Upstash Redis behind the same interface. Documented in
 * docs/ARCHITECTURE.md.
 */
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: options.limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  return {
    ok: existing.count <= options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Test helper — not used by the app. */
export function resetRateLimits() {
  buckets.clear();
}
