// Lightweight in-memory rate limiter. No external dependencies — works in both
// the Edge runtime (middleware) and the Node runtime (route handlers / Auth.js
// provider). Each runtime/instance keeps its own Map, so this is a best-effort,
// per-instance guard against bursty abuse (e.g. magic-link email bombing).
//
// IMPORTANT: On serverless this does NOT give a global limit across all
// instances. The authoritative throttle for /api/auth/signin lives at the edge
// (Cloudflare WAF rate-limit rule). This is defense-in-depth for the app layer.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { ok: boolean; retryAfter: number }

/**
 * Fixed-window rate limit.
 * @param key      unique identity for the limit (e.g. `signin-ip:1.2.3.4`)
 * @param limit    max allowed hits within the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  // Opportunistic cleanup so the Map can't grow unbounded under attack.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k)
    }
  }

  const existing = buckets.get(key)
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  existing.count++
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  return { ok: true, retryAfter: 0 }
}
