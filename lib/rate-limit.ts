/**
 * Simple in-memory fixed-window rate limiter.
 * Works for single-instance deployments (Railway default).
 */
const store = new Map<string, { count: number; resetAt: number }>()

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 * @param key    Unique key (e.g. `userId:endpoint`)
 * @param limit  Max requests allowed per window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
