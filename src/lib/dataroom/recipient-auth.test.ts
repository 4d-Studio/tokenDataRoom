import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

/**
 * Tests the in-memory fallback store for recipient auth.
 * When DATABASE_URL is not set (test environment), all operations use the
 * in-memory Maps so tests are fully isolated and fast.
 */
import {
  createRecipientLoginCode,
  getOrCreateRecipientAccount,
  getRecipientAccountByEmail,
  markRecipientEmailVerified,
  verifyRecipientLoginCode,
} from "@/lib/dataroom/recipient-auth";

describe("recipient-auth (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("DATABASE_URL", "");
    // Re-import to get a fresh in-memory store between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  // ── Accounts ────────────────────────────────────────────────────────────────

  describe("getOrCreateRecipientAccount", () => {
    it("creates a new account on first call", async () => {
      const account = await getOrCreateRecipientAccount("alice@example.com");

      expect(account.email).toBe("alice@example.com");
      expect(account.id).toBeTruthy();
      expect(account.verifiedAt).toBeNull();
      expect(account.lastLogin).toBeTruthy();
    });

    it("normalizes email to lowercase", async () => {
      const account = await getOrCreateRecipientAccount("Bob@COMPANY.COM");
      expect(account.email).toBe("bob@company.com");
    });

    it("updates lastLogin on repeated calls", async () => {
      const first = await getOrCreateRecipientAccount("carol@example.com");
      await vi.advanceTimersByTimeAsync(1000);
      const second = await getOrCreateRecipientAccount("carol@example.com");

      expect(second.id).toBe(first.id);
      expect(second.lastLogin).not.toBe(first.lastLogin);
    });

    it("returns the same id on repeated calls", async () => {
      const first = await getOrCreateRecipientAccount("dave@example.com");
      const second = await getOrCreateRecipientAccount("dave@example.com");

      expect(second.id).toBe(first.id);
    });
  });

  describe("getRecipientAccountByEmail", () => {
    it("returns null for unknown email", async () => {
      const result = await getRecipientAccountByEmail("nobody@nowhere.com");
      expect(result).toBeNull();
    });

    it("returns the account after it is created", async () => {
      await getOrCreateRecipientAccount("eve@example.com");
      const result = await getRecipientAccountByEmail("eve@example.com");

      expect(result).not.toBeNull();
      expect(result!.email).toBe("eve@example.com");
    });

    it("normalizes email before lookup", async () => {
      await getOrCreateRecipientAccount("frank@example.com");
      const result = await getRecipientAccountByEmail("FRANK@example.com");

      expect(result).not.toBeNull();
    });
  });

  describe("markRecipientEmailVerified", () => {
    it("sets verifiedAt on the account", async () => {
      await getOrCreateRecipientAccount("grace@example.com");
      await markRecipientEmailVerified("grace@example.com");

      const account = await getRecipientAccountByEmail("grace@example.com");
      expect(account!.verifiedAt).not.toBeNull();
    });

    it("is idempotent (calling twice does not throw)", async () => {
      await getOrCreateRecipientAccount("heidi@example.com");
      await markRecipientEmailVerified("heidi@example.com");
      await expect(markRecipientEmailVerified("heidi@example.com")).resolves.not.toThrow();
    });
  });

  // ── Login codes ─────────────────────────────────────────────────────────────

  describe("createRecipientLoginCode", () => {
    it("returns a 6-digit numeric code", async () => {
      const { code } = await createRecipientLoginCode("ivan@example.com", "room-slug");
      expect(code).toMatch(/^\d{6}$/);
    });

    it("returns an expiresAt ISO timestamp 10 minutes in the future", async () => {
      vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
      const { expiresAt } = await createRecipientLoginCode("judy@example.com", "room-slug");
      expect(expiresAt).toBe(new Date("2026-04-05T12:10:00Z").toISOString());
    });

    it("generates different codes on successive calls", async () => {
      const { code: first } = await createRecipientLoginCode("kate@example.com", "room-slug");
      const { code: second } = await createRecipientLoginCode("kate@example.com", "room-slug");
      expect(first).not.toBe(second);
    });
  });

  describe("verifyRecipientLoginCode", () => {
    it("returns null for unknown email", async () => {
      const result = await verifyRecipientLoginCode("neverheard@example.com", "000000");
      expect(result).toBeNull();
    });

    it("returns null for wrong code", async () => {
      await createRecipientLoginCode("mallory@example.com", "room-slug");
      const result = await verifyRecipientLoginCode("mallory@example.com", "999999");
      expect(result).toBeNull();
    });

    it("returns the email and invalidates the code after use", async () => {
      const { code } = await createRecipientLoginCode("oscar@example.com", "room-slug");

      const first = await verifyRecipientLoginCode("oscar@example.com", code);
      expect(first).toBe("oscar@example.com");

      // Code already used — subsequent verify fails
      const second = await verifyRecipientLoginCode("oscar@example.com", code);
      expect(second).toBeNull();
    });

    it("returns null for wrong email", async () => {
      await createRecipientLoginCode("nancy@example.com", "room-slug");
      const result = await verifyRecipientLoginCode("wrong@email.com", "000000");
      expect(result).toBeNull();
    });

    it("returns the email and marks code as used on success", async () => {
      const { code } = await createRecipientLoginCode("oscar@example.com", "room-slug");

      const first = await verifyRecipientLoginCode("oscar@example.com", code);
      expect(first).toBe("oscar@example.com");

      // Second use of the same code should fail (already used)
      const second = await verifyRecipientLoginCode("oscar@example.com", code);
      expect(second).toBeNull();
    });
  });
});
