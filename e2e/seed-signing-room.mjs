/**
 * Seeds a local vault (./.dataroom/vaults) with one PDF and one active signing workflow.
 * Run with the same TKN_APP_SECRET as the dev server (see .env.local) so invite tokens verify.
 *
 * Usage: node e2e/seed-signing-room.mjs
 */
import { createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** This file lives in `e2e/`; repo root is one level up (cwd may be `e2e/` when Playwright runs the seed). */
const e2eDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(e2eDir, "..");

const SLUG = "fm-e2e00000001";
const REQUEST_ID = "22222222-2222-2222-2222-222222222222";
const SIGNER_ID = "33333333-3333-3333-3333-333333333333";

const DEFAULT_SECRET = "playwright-e2e-secret-32chars-min!!";

function loadSecretFromEnvLocal() {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^TKN_APP_SECRET=(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const secret =
  process.env.TKN_APP_SECRET?.trim() || loadSecretFromEnvLocal() || DEFAULT_SECRET;

if (!process.env.TKN_APP_SECRET?.trim() && !loadSecretFromEnvLocal()) {
  console.warn(
    "[e2e] No TKN_APP_SECRET in env or .env.local — using default test secret. " +
      "Start dev with: TKN_APP_SECRET=" +
      DEFAULT_SECRET +
      " pnpm dev\n" +
      "or add TKN_APP_SECRET to .env.local and re-run this seed.",
  );
}

function mintToken() {
  const body = Buffer.from(
    JSON.stringify({
      slug: SLUG,
      requestId: REQUEST_ID,
      signerId: SIGNER_ID,
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

const vaultRoot = join(projectRoot, ".dataroom", "vaults", SLUG);
mkdirSync(join(vaultRoot, "files"), { recursive: true });
writeFileSync(join(vaultRoot, "files", "file-pdf-1.bin"), Buffer.from([0]));
writeFileSync(join(vaultRoot, "events.json"), "[]\n");
writeFileSync(join(vaultRoot, "acceptances.json"), "[]\n");

const metadata = {
  id: "e2e-vault-1",
  slug: SLUG,
  ownerKey: "playwright-owner-key-32chars-minimum-!!",
  title: "E2E signing room",
  senderName: "Playwright",
  requiresNda: false,
  ndaVersion: "none",
  status: "active",
  createdAt: new Date().toISOString(),
  expiresAt: "2099-01-01T00:00:00.000Z",
  hasEncryptedFile: true,
  fileName: "contract.pdf",
  mimeType: "application/pdf",
  fileSize: 1,
  salt: "c2FsdA==",
  iv: "aXY=",
  pbkdf2Iterations: 100_000,
  vaultFiles: [
    {
      id: "file-pdf-1",
      name: "contract.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
      salt: "c2FsdA==",
      iv: "aXY=",
      pbkdf2Iterations: 100_000,
    },
  ],
  signingRequests: [
    {
      id: REQUEST_ID,
      fileId: "file-pdf-1",
      createdAt: new Date().toISOString(),
      status: "active",
      currentOrderIndex: 0,
      signers: [
        {
          id: SIGNER_ID,
          email: "signer@e2e.test",
          name: "E2E Signer",
          order: 0,
          status: "pending",
        },
      ],
    },
  ],
};

writeFileSync(join(vaultRoot, "metadata.json"), JSON.stringify(metadata, null, 2));

const token = mintToken();
const port = process.env.SIGNING_E2E_PORT || process.env.PORT || "3000";
const url = `http://127.0.0.1:${port}/s/${SLUG}/sign/${REQUEST_ID}?token=${encodeURIComponent(token)}`;
const outFile = join(e2eDir, ".sign-url");
writeFileSync(outFile, url, "utf8");

console.log("[e2e] Seeded", vaultRoot);
console.log("[e2e] Open:\n", url);
