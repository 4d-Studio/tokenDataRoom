import { beforeEach, describe, expect, it, vi } from "vitest";

const { readVaultAccessFromCookies } = vi.hoisted(() => ({
  readVaultAccessFromCookies: vi.fn(),
}));

vi.mock("@/lib/dataroom/access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dataroom/access")>();
  return {
    ...actual,
    readVaultAccessFromCookies,
  };
});

vi.mock("@/lib/dataroom/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetVaultMetadata = vi.fn();
const mockAddVaultFile = vi.fn();
const mockUpdateVaultMetadata = vi.fn();
const mockAppendEvent = vi.fn();
const mockGetVaultFile = vi.fn();
const mockDeleteVaultFile = vi.fn();
const mockGetEvents = vi.fn();

vi.mock("@/lib/dataroom/storage", () => ({
  getVaultStorage: vi.fn(() => ({
    getVaultMetadata: mockGetVaultMetadata,
    addVaultFile: mockAddVaultFile,
    updateVaultMetadata: mockUpdateVaultMetadata,
    appendEvent: mockAppendEvent,
    getVaultFile: mockGetVaultFile,
    deleteVaultFile: mockDeleteVaultFile,
    getEvents: mockGetEvents,
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined as { value: string } | undefined,
  })),
}));

import { DELETE, POST } from "@/app/api/vaults/[slug]/payload/route";
import type { VaultRecord } from "@/lib/dataroom/types";

const slug = "fm-aaaaaaaaaaaa";
const baseVault = (): VaultRecord => ({
  id: "v1",
  slug,
  ownerKey: "owner-key-32chars-minimum-xxxxxxxx",
  title: "Test room",
  senderName: "Sender",
  requiresNda: false,
  ndaVersion: "v1",
  status: "active",
  createdAt: new Date().toISOString(),
  expiresAt: "2099-01-01T00:00:00.000Z",
  hasEncryptedFile: true,
  fileName: "a.pdf",
  mimeType: "application/pdf",
  fileSize: 10,
  salt: "c2FsdA==",
  iv: "aXZpdmUxMjM=",
  pbkdf2Iterations: 210_000,
  vaultFiles: [
    {
      id: "f-owner",
      name: "owner.pdf",
      mimeType: "application/pdf",
      sizeBytes: 9,
      addedAt: new Date().toISOString(),
      salt: "c2FsdA==",
      iv: "aXZpdmUxMjM=",
      pbkdf2Iterations: 210_000,
    },
    {
      id: "f-peer",
      name: "peer.pdf",
      mimeType: "application/pdf",
      sizeBytes: 9,
      addedAt: new Date().toISOString(),
      salt: "c2FsdA==",
      iv: "aXZpdmUxMjM=",
      pbkdf2Iterations: 210_000,
      uploadedBySignerEmail: "peer@example.com",
    },
  ],
  contributorRecipientEmails: ["uploader@example.com"],
});

describe("POST /api/vaults/[slug]/payload contributor path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readVaultAccessFromCookies.mockReturnValue(null);
    mockGetVaultMetadata.mockResolvedValue(baseVault());
    mockAddVaultFile.mockResolvedValue(undefined);
    mockUpdateVaultMetadata.mockResolvedValue(undefined);
    mockAppendEvent.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue([]);
  });

  it("returns 403 when contributor metadata is valid but there is no access cookie", async () => {
    const enc = new Uint8Array([1, 2, 3]);
    const fd = new FormData();
    fd.append(
      "metadata",
      JSON.stringify({
        contributorUpload: true,
        fileName: "doc.pdf",
        mimeType: "application/pdf",
        fileSize: 3,
        salt: "c2FsdA==",
        iv: "aXZpdmUxMjM=",
        pbkdf2Iterations: 210_000,
      }),
    );
    fd.append("encryptedFile", new File([enc], "x.filmia", { type: "application/octet-stream" }));

    const res = await POST(new Request("http://localhost/api", { method: "POST", body: fd }), {
      params: Promise.resolve({ slug }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/vaults/[slug]/payload contributor path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendEvent.mockResolvedValue(undefined);
    mockDeleteVaultFile.mockResolvedValue(undefined);
    mockUpdateVaultMetadata.mockResolvedValue(undefined);
  });

  it("returns 403 when contributor tries to delete another user's file", async () => {
    readVaultAccessFromCookies.mockReturnValue({
      slug,
      acceptanceId: "acc-1",
      signerName: "U",
      signerEmail: "uploader@example.com",
      signerAddress: "addr",
      signatureName: "U",
      ndaVersion: "v1",
      acceptedAt: new Date().toISOString(),
    });
    mockGetVaultMetadata.mockResolvedValue(baseVault());

    const res = await DELETE(
      new Request(`http://localhost/api?fileId=f-peer`, { method: "DELETE" }),
      { params: Promise.resolve({ slug }) },
    );
    expect(res.status).toBe(403);
  });
});
