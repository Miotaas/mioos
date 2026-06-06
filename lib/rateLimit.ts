/**
 * In-memory rate limiter — Node.js runtime only, do not import from middleware.
 * State persists within the server process. Resets on container restart (acceptable).
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

export function checkRateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
