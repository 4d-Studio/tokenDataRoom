import { describe, expect, it, beforeEach, vi } from "vitest";

import { checkRateLimit, rateLimitKey } from "@/lib/dataroom/rate-limit";

describe("rateLimitKey", () => {
  it("normalizes email to lowercase", () => {
    expect(rateLimitKey("1.2.3.4", "Alice@Example.COM")).toBe("1.2.3.4::alice@example.com");
  });

  it("trims whitespace from email", () => {
    expect(rateLimitKey("1.2.3.4", "  bob@test.com  ")).toBe("1.2.3.4::bob@test.com");
  });
});

describe("checkRateLimit — sliding window", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
  });

  it("allows first request in a new window", () => {
    const result = checkRateLimit("1.1.1.1::alice@example.com");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1
  });

  it("counts up to the limit", () => {
    const key = "2.2.2.2::bob@example.com";
    expect(checkRateLimit(key).allowed).toBe(true);  // 1st — remaining 2
    expect(checkRateLimit(key).allowed).toBe(true);  // 2nd — remaining 1
    expect(checkRateLimit(key).allowed).toBe(true);  // 3rd — remaining 0
  });

  it("blocks the 4th request within the window", () => {
    const key = "3.3.3.3::carol@example.com";
    checkRateLimit(key); // 1
    checkRateLimit(key); // 2
    checkRateLimit(key); // 3 — remaining 0
    const result = checkRateLimit(key); // 4 — blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets the window after 60 seconds", () => {
    const key = "4.4.4.4::dave@example.com";
    checkRateLimit(key); // 1
    checkRateLimit(key); // 2
    checkRateLimit(key); // 3

    // Advance 61 seconds — new window
    vi.advanceTimersByTime(61_000);

    const result = checkRateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // Reset to 2 remaining
  });

  it("treats different keys independently", () => {
    const keyA = "5.5.5.5::eve@example.com";
    const keyB = "6.6.6.6::frank@example.com";

    // Exhaust keyA
    checkRateLimit(keyA); // 1
    checkRateLimit(keyA); // 2
    checkRateLimit(keyA); // 3 — exhausted

    // keyB should still be allowed
    const result = checkRateLimit(keyB);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
