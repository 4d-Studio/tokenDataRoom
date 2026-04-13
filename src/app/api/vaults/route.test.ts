import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSaveVault, mockAppendEvent } = vi.hoisted(() => ({
  mockSaveVault: vi.fn(),
  mockAppendEvent: vi.fn(),
}));

vi.mock("@/lib/dataroom/auth", () => ({
  getCurrentUser: vi.fn(),
  getCurrentWorkspace: vi.fn(),
  recordWorkspaceRoom: vi.fn(),
}));

vi.mock("@/lib/dataroom/storage", () => ({
  getVaultStorage: vi.fn(() => ({
    saveVault: mockSaveVault,
    appendEvent: mockAppendEvent,
  })),
}));

import { AUTH_STATE_TABLE_MISSING_MARKER } from "@/lib/dataroom/auth-state-errors";
import { getCurrentUser, getCurrentWorkspace, recordWorkspaceRoom } from "@/lib/dataroom/auth";
import { POST } from "@/app/api/vaults/route";
import type { VaultRecord } from "@/lib/dataroom/types";

function validRoomMetadata() {
  return {
    title: "Legal data room",
    senderName: "Ada Lovelace",
    senderCompany: "Analytical Engines Ltd",
    message: "",
    requiresNda: false,
    ndaText: "",
    ndaDisclosingParty: "",
    ndaReceivingParty: "",
    expiresInDays: 14,
  };
}

function formWithMetadata(obj: unknown) {
  const fd = new FormData();
  fd.append("metadata", JSON.stringify(obj));
  return fd;
}

describe("POST /api/vaults", () => {
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveVault.mockResolvedValue(undefined);
    mockAppendEvent.mockResolvedValue(undefined);
    vi.mocked(recordWorkspaceRoom).mockResolvedValue(undefined);
  });

  it("returns 401 without session user/workspace", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.mocked(getCurrentWorkspace).mockResolvedValue(null);

    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(validRoomMetadata()),
      }),
    );

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/Login/i);
    expect(mockSaveVault).not.toHaveBeenCalled();
  });

  it("returns 400 when metadata field missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const fd = new FormData();
    const res = await POST(
      new Request("https://app.test/api/vaults", { method: "POST", body: fd }),
    );
    expect(res.status).toBe(400);
    expect(mockSaveVault).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON metadata", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const fd = new FormData();
    fd.append("metadata", "not-json");
    const res = await POST(
      new Request("https://app.test/api/vaults", { method: "POST", body: fd }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when Zod rejects room payload", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const bad = { ...validRoomMetadata(), title: "ab" };
    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(bad),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockSaveVault).not.toHaveBeenCalled();
  });

  it("returns 400 when NDA required but no body, no workspace template, and no party names", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const meta = {
      ...validRoomMetadata(),
      requiresNda: true,
      ndaText: "",
      ndaDisclosingParty: "",
      ndaReceivingParty: "",
    };
    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(meta),
      }),
    );
    expect(res.status).toBe(400);
    expect(mockSaveVault).not.toHaveBeenCalled();
  });

  it("persists default NDA built from party names when NDA required", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const meta = {
      ...validRoomMetadata(),
      requiresNda: true,
      ndaText: "",
      ndaDisclosingParty: "Acme Corp",
      ndaReceivingParty: "Beta LLC",
    };
    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(meta),
      }),
    );
    expect(res.status).toBe(200);
    const saved = mockSaveVault.mock.calls[0][0] as VaultRecord;
    expect(saved.ndaText).toContain("Acme Corp");
    expect(saved.ndaText).toContain("Beta LLC");
  });

  it("returns 200 and persists room-only vault when storage succeeds", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(validRoomMetadata()),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { slug: string; shareUrl: string; manageUrl: string };
    expect(json.slug).toMatch(/^[a-z0-9-]+$/);
    expect(json.shareUrl).toContain(`/s/${json.slug}`);
    expect(json.manageUrl).toContain("key=");

    expect(mockSaveVault).toHaveBeenCalledTimes(1);
    expect(mockSaveVault.mock.calls[0][1]).toBeNull();
    expect(mockAppendEvent).toHaveBeenCalledTimes(1);
    expect(recordWorkspaceRoom).toHaveBeenCalledWith(
      "w1",
      expect.objectContaining({ slug: json.slug, title: "Legal data room" }),
    );
  });

  it("returns 503 JSON (never opaque 500) when saveVault throws auth table marker", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    mockSaveVault.mockRejectedValue(
      new Error(`missing (${AUTH_STATE_TABLE_MISSING_MARKER})`),
    );

    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(validRoomMetadata()),
      }),
    );

    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string; code: string };
    expect(json.code).toBe("AUTH_STATE_TABLE_MISSING");
    expect(json.error).toBeTruthy();
  });

  it("returns 503 when recordWorkspaceRoom fails with DB marker", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      createdAt: "",
      lastLoginAt: "",
      plan: "plus",
    });
    vi.mocked(getCurrentWorkspace).mockResolvedValue({
      id: "w1",
      userId: "u1",
      name: "WS",
      companyName: "Co",
      createdAt: "",
      ndaTemplate: undefined,
    });

    vi.mocked(recordWorkspaceRoom).mockRejectedValue(
      new Error(AUTH_STATE_TABLE_MISSING_MARKER),
    );

    const res = await POST(
      new Request("https://app.test/api/vaults", {
        method: "POST",
        body: formWithMetadata(validRoomMetadata()),
      }),
    );

    expect(res.status).toBe(503);
    const json = (await res.json()) as { code?: string; error: string };
    expect(json.code).toBe("AUTH_STATE_TABLE_MISSING");
  });
});
