interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const CLEANUP_THRESHOLD = 500;
// Evict entries idle for longer than this, regardless of store size
const IDLE_TTL_MS = 60 * 60 * 1000; // 1 hour
// Run evictIdle only every N new windows to avoid per-request full scans
const IDLE_EVICT_INTERVAL = 50;
let newWindowCount = 0;

/**
 * Returns true if the request should be allowed, false if rate-limited.
 * Also returns the number of seconds until the window resets.
 */
export function allowRequest(
  ip: string,
  windowMs = WINDOW_MS,
  maxRequests = MAX_REQUESTS,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    newWindowCount++;
    if (store.size > CLEANUP_THRESHOLD) {
      evictExpired(now);
    } else if (newWindowCount % IDLE_EVICT_INTERVAL === 0) {
      evictIdle(now);
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

function evictExpired(now: number) {
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/** Remove entries whose window ended more than IDLE_TTL_MS ago. */
function evictIdle(now: number) {
  for (const [key, entry] of store) {
    if (now > entry.resetAt + IDLE_TTL_MS) store.delete(key);
  }
}
