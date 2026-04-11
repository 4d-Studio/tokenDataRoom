import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_SECRET = "test-secret-for-signing-flow-tests-ok!!";

const { mockGetVaultMetadata, mockUpdateVaultMetadata, mockAppendEvent } = vi.hoisted(() => ({
  mockGetVaultMetadata: vi.fn(),
  mockUpdateVaultMetadata: vi.fn(),
  mockAppendEvent: vi.fn(),
}));

vi.mock("@/lib/dataroom/storage", () => ({
  getVaultStorage: vi.fn(() => ({
    getVaultMetadata: mockGetVaultMetadata,
    updateVaultMetadata: mockUpdateVaultMetadata,
    appendEvent: mockAppendEvent,
  })),
}));

import { GET as getSigningBootstrap } from "@/app/api/vaults/[slug]/signing/[requestId]/route";
import { POST as postSigningSign } from "@/app/api/vaults/[slug]/signing/[requestId]/sign/route";
import { GET as getSigningCertificate } from "@/app/api/vaults/[slug]/signing/[requestId]/certificate/route";
import { createSigningInviteToken } from "@/lib/dataroom/signing-invite-token";
import type { SigningRequest, VaultRecord } from "@/lib/dataroom/types";

const SLUG = "fm-aaaaaaaaaaaa";
const REQUEST_ID = "11111111-1111-1111-1111-111111111111";
const SIGNER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SIGNER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function baseVault(overrides: Partial<VaultRecord> = {}): VaultRecord {
  return {
    id: "vault-1",
    slug: SLUG,
    ownerKey: "owner-key-at-least-32-characters-long!!",
    title: "Signing test room",
    senderName: "Test Sender",
    requiresNda: false,
    ndaVersion: "none",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
    hasEncryptedFile: true,
    fileName: "contract.pdf",
    mimeType: "application/pdf",
    fileSize: 100,
    salt: "c2FsdA==",
    iv: "aXY=",
    pbkdf2Iterations: 100_000,
    vaultFiles: [
      {
        id: "file-pdf-1",
        name: "contract.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        salt: "c2FsdA==",
        iv: "aXY=",
        pbkdf2Iterations: 100_000,
      },
    ],
    ...overrides,
  };
}

function twoSignerRequest(): SigningRequest {
  return {
    id: REQUEST_ID,
    fileId: "file-pdf-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    currentOrderIndex: 0,
    signers: [
      {
        id: SIGNER_A,
        email: "alice@example.com",
        name: "Alice",
        order: 0,
        status: "pending",
      },
      {
        id: SIGNER_B,
        email: "bob@example.com",
        order: 1,
        status: "pending",
      },
    ],
  };
}

describe("document signing routes (integration)", () => {
  let vault: VaultRecord;

  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TKN_APP_SECRET", TEST_SECRET);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vault = baseVault({ signingRequests: [twoSignerRequest()] });
    mockGetVaultMetadata.mockResolvedValue(vault);
    mockUpdateVaultMetadata.mockImplementation(async (m: VaultRecord) => {
      vault = m;
    });
    mockAppendEvent.mockResolvedValue(undefined);
  });

  function tokenFor(signerId: string) {
    return createSigningInviteToken({
      slug: SLUG,
      requestId: REQUEST_ID,
      signerId,
    });
  }

  const params = Promise.resolve({ slug: SLUG, requestId: REQUEST_ID });

  it("GET bootstrap: first signer sees ready", async () => {
    const res = await getSigningBootstrap(
      new Request(
        `http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}?token=${encodeURIComponent(tokenFor(SIGNER_A))}`,
      ),
      { params },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { phase: string; fileName: string };
    expect(json.phase).toBe("ready");
    expect(json.fileName).toBe("contract.pdf");
  });

  it("GET bootstrap: second signer sees waiting", async () => {
    const res = await getSigningBootstrap(
      new Request(
        `http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}?token=${encodeURIComponent(tokenFor(SIGNER_B))}`,
      ),
      { params },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { phase: string };
    expect(json.phase).toBe("waiting");
  });

  it("POST sign: sequential completion then certificate", async () => {
    const tA = tokenFor(SIGNER_A);
    const resA = await postSigningSign(
      new Request(`http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tA,
          signatureName: "Alice A",
        }),
      }),
      { params },
    );
    expect(resA.status).toBe(200);
    const bodyA = (await resA.json()) as { completed: boolean };
    expect(bodyA.completed).toBe(false);

    mockGetVaultMetadata.mockResolvedValue(vault);

    const tB = tokenFor(SIGNER_B);
    const resB = await postSigningSign(
      new Request(`http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tB,
          signatureName: "Bob B",
        }),
      }),
      { params },
    );
    expect(resB.status).toBe(200);
    const bodyB = (await resB.json()) as { completed: boolean };
    expect(bodyB.completed).toBe(true);

    mockGetVaultMetadata.mockResolvedValue(vault);

    const cert = await getSigningCertificate(
      new Request(
        `http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}/certificate?token=${encodeURIComponent(tB)}`,
      ),
      { params },
    );
    expect(cert.status).toBe(200);
    const html = await cert.text();
    expect(html).toContain("Completion certificate");
    expect(html).toContain("Alice A");
    expect(html).toContain("Bob B");
  });

  it("POST sign: rejects out-of-order signer", async () => {
    const res = await postSigningSign(
      new Request(`http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenFor(SIGNER_B),
          signatureName: "Bob",
        }),
      }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("POST sign: accepts drawn signature with short typed name when image sent", async () => {
    const res = await postSigningSign(
      new Request(`http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenFor(SIGNER_A),
          signatureName: "",
          signatureImage: "data:image/png;base64,iVBORw0KGgo=",
        }),
      }),
      { params },
    );
    expect(res.status).toBe(200);
  });

  it("GET bootstrap allows read when room revoked but workflow completed", async () => {
    vault = baseVault({
      status: "revoked",
      signingRequests: [
        {
          ...twoSignerRequest(),
          status: "completed",
          currentOrderIndex: 2,
          signers: twoSignerRequest().signers.map((s, i) => ({
            ...s,
            status: "signed",
            signedAt: "2026-01-02T00:00:00.000Z",
            signatureName: i === 0 ? "A" : "B",
          })),
        },
      ],
    });
    mockGetVaultMetadata.mockResolvedValue(vault);

    const res = await getSigningBootstrap(
      new Request(
        `http://localhost/api/vaults/${SLUG}/signing/${REQUEST_ID}?token=${encodeURIComponent(tokenFor(SIGNER_A))}`,
      ),
      { params },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { phase: string };
    expect(json.phase).toBe("completed");
  });
});
