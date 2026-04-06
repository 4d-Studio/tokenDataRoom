import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";

import {
  createAccessToken,
  verifyAccessToken,
  vaultAcceptanceToAccessPayload,
  accessCookieName,
  vaultViewerBindingCookieName,
} from "@/lib/dataroom/access";
import type { VaultAcceptanceRecord } from "@/lib/dataroom/types";

const TEST_SECRET = "test-secret-for-unit-tests-only-32chars!";

const makeAcceptance = (overrides: Partial<VaultAcceptanceRecord> = {}): VaultAcceptanceRecord => ({
  id: "acceptance-id-123",
  acceptedAt: "2026-04-05T12:00:00.000Z",
  ndaVersion: "1.0",
  signerName: "Jane Doe",
  signerEmail: "jane@example.com",
  signerCompany: "Acme Corp",
  signerAddress: "123 Main St, City, State, Zip",
  signatureName: "Jane Doe",
  ...overrides,
});

describe("createAccessToken + verifyAccessToken", () => {
  beforeAll(() => {
    // Stub env BEFORE importing so the module sees it at load time
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TKN_APP_SECRET", TEST_SECRET);
    vi.resetModules();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("creates a non-empty base64url token", () => {
    const token = createAccessToken({
      slug: "my-room",
      acceptanceId: "acc-1",
      signerName: "Jane",
      signerEmail: "jane@example.com",
      signerAddress: "123 Main St",
      signatureName: "Jane",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
    });
    expect(token.split(".").length).toBe(2); // body.signature
    expect(token.length).toBeGreaterThan(20);
  });

  it("round-trips: verify returns the same payload", () => {
    const payload = {
      slug: "my-room",
      acceptanceId: "acc-2",
      signerName: "Bob",
      signerEmail: "bob@example.com",
      signerCompany: "Beta Inc",
      signerAddress: "456 Oak Ave",
      signatureName: "Bob Smith",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
    };
    const token = createAccessToken(payload);
    const verified = verifyAccessToken(token, "my-room");
    expect(verified).not.toBeNull();
    expect(verified!.acceptanceId).toBe("acc-2");
    expect(verified!.signerName).toBe("Bob");
    expect(verified!.signerEmail).toBe("bob@example.com");
    expect(verified!.signerCompany).toBe("Beta Inc");
  });

  it("returns null for an invalid token", () => {
    const result = verifyAccessToken("not.a.valid.token", "my-room");
    expect(result).toBeNull();
  });

  it("returns null for undefined token", () => {
    const result = verifyAccessToken(undefined, "my-room");
    expect(result).toBeNull();
  });

  it("returns null for empty string token", () => {
    const result = verifyAccessToken("", "my-room");
    expect(result).toBeNull();
  });

  it("returns null when token body is not valid JSON", () => {
    // Manually create a token with malformed body (valid base64url but not JSON)
    const body = Buffer.from("not json", "utf8").toString("base64url");
    const result = verifyAccessToken(`${body}.sig`, "my-room");
    expect(result).toBeNull();
  });

  it("returns null when slug does not match", () => {
    const token = createAccessToken({
      slug: "room-a",
      acceptanceId: "acc-3",
      signerName: "Carol",
      signerEmail: "carol@example.com",
      signerAddress: "789 Pine Rd",
      signatureName: "Carol",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
    });
    const result = verifyAccessToken(token, "room-b");
    expect(result).toBeNull();
  });

  it("returns null when token is tampered (wrong signature)", () => {
    const token = createAccessToken({
      slug: "my-room",
      acceptanceId: "acc-4",
      signerName: "Dave",
      signerEmail: "dave@example.com",
      signerAddress: "321 Elm St",
      signatureName: "Dave",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
    });
    const [body] = token.split(".");
    // Swap in a different body
    const tamperedToken = `${Buffer.from('{"slug":"my-room","acceptanceId":"hacked","signerName":"Hacker","signerEmail":"hacker@evil.com","signerAddress":"evil","signatureName":"H","ndaVersion":"1.0","acceptedAt":"2026-04-05T12:00:00Z"}', "utf8").toString("base64url")}.${body}`;
    const result = verifyAccessToken(tamperedToken, "my-room");
    expect(result).toBeNull();
  });

  it("returns null when viewerBinding is in payload but cookie is missing", () => {
    const token = createAccessToken({
      slug: "my-room",
      acceptanceId: "acc-5",
      signerName: "Eve",
      signerEmail: "eve@example.com",
      signerAddress: "555 Birch Ln",
      signatureName: "Eve",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
      viewerBinding: "binding-uuid-123",
    });
    // No viewer binding cookie passed
    const result = verifyAccessToken(token, "my-room");
    expect(result).toBeNull();
  });

  it("returns payload when viewerBinding matches cookie", () => {
    const binding = "binding-uuid-456";
    const token = createAccessToken({
      slug: "my-room",
      acceptanceId: "acc-6",
      signerName: "Frank",
      signerEmail: "frank@example.com",
      signerAddress: "666 Cedar Dr",
      signatureName: "Frank",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
      viewerBinding: binding,
    });
    const result = verifyAccessToken(token, "my-room", binding);
    expect(result).not.toBeNull();
    expect(result!.acceptanceId).toBe("acc-6");
  });

  it("returns null when viewerBinding cookie does not match payload", () => {
    const token = createAccessToken({
      slug: "my-room",
      acceptanceId: "acc-7",
      signerName: "Grace",
      signerEmail: "grace@example.com",
      signerAddress: "777 Spruce Way",
      signatureName: "Grace",
      ndaVersion: "1.0",
      acceptedAt: "2026-04-05T12:00:00Z",
      viewerBinding: "correct-binding",
    });
    const result = verifyAccessToken(token, "my-room", "wrong-binding");
    expect(result).toBeNull();
  });
});

describe("vaultAcceptanceToAccessPayload", () => {
  it("maps all acceptance fields into the access payload", () => {
    const acceptance = makeAcceptance();
    const payload = vaultAcceptanceToAccessPayload("room-slug", acceptance);

    expect(payload.slug).toBe("room-slug");
    expect(payload.acceptanceId).toBe(acceptance.id);
    expect(payload.signerName).toBe(acceptance.signerName);
    expect(payload.signerEmail).toBe(acceptance.signerEmail);
    expect(payload.signerCompany).toBe(acceptance.signerCompany);
    expect(payload.signerAddress).toBe(acceptance.signerAddress);
    expect(payload.signatureName).toBe(acceptance.signatureName);
    expect(payload.ndaVersion).toBe(acceptance.ndaVersion);
    expect(payload.acceptedAt).toBe(acceptance.acceptedAt);
  });
});

describe("accessCookieName", () => {
  it("prefixes the slug with tkn_access_", () => {
    expect(accessCookieName("my-room")).toBe("tkn_access_my-room");
  });
});

describe("vaultViewerBindingCookieName", () => {
  it("prefixes the slug with tkn_vbind_", () => {
    expect(vaultViewerBindingCookieName("my-room")).toBe("tkn_vbind_my-room");
  });
});
