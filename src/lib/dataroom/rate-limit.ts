/**
 * Simple in-memory rate limiter for auth endpoints.
 * Railway single-instance = one process = one Map.
 * Reset on cold start (acceptable for auth endpoints).
 *
 * Strategy: sliding window per IP + email combo.
 * Allows burst of 3 requests per 60s window per (IP, email).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 3;

const store = new Map<string, RateLimitEntry>();

export const checkRateLimit = (key: string): { allowed: boolean; remaining: number; retryAfter?: number } => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // Start new window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
};

/** Build a rate-limit key from request IP and email. */
export const rateLimitKey = (ip: string, email: string): string =>
  `${ip}::${email.toLowerCase().trim()}`;
