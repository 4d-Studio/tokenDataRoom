/**
 * Seeds a minimal vault for manage-page "team uploaders" UI smoke test.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(e2eDir, "..");
const SLUG = "fm-e2e000000020";

const vaultRoot = join(projectRoot, ".dataroom", "vaults", SLUG);
mkdirSync(join(vaultRoot, "files"), { recursive: true });
writeFileSync(join(vaultRoot, "files", "file-1.bin"), Buffer.from([0]));
writeFileSync(join(vaultRoot, "events.json"), "[]\n");
writeFileSync(join(vaultRoot, "acceptances.json"), "[]\n");

const metadata = {
  id: "e2e-contrib-vault",
  slug: SLUG,
  ownerKey: "playwright-owner-key-32chars-minimum-!!",
  title: "E2E contributor manage",
  senderName: "Playwright",
  requiresNda: false,
  ndaVersion: "none",
  status: "active",
  createdAt: new Date().toISOString(),
  expiresAt: "2099-01-01T00:00:00.000Z",
  restrictRecipientEmails: true,
  allowedRecipientEmails: ["uploader@e2e.test", "viewer@e2e.test"],
  contributorRecipientEmails: [],
  hasEncryptedFile: true,
  fileName: "stub.pdf",
  mimeType: "application/pdf",
  fileSize: 1,
  salt: "c2FsdA==",
  iv: "aXY=",
  pbkdf2Iterations: 100_000,
  vaultFiles: [
    {
      id: "file-1",
      name: "stub.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
      salt: "c2FsdA==",
      iv: "aXY=",
      pbkdf2Iterations: 100_000,
    },
  ],
};

writeFileSync(join(vaultRoot, "metadata.json"), JSON.stringify(metadata, null, 2));

const port = process.env.SIGNING_E2E_PORT || process.env.PORT || "3000";
const manageUrl = `http://127.0.0.1:${port}/m/${SLUG}?key=${encodeURIComponent(metadata.ownerKey)}`;
writeFileSync(join(e2eDir, ".contrib-manage-url"), manageUrl, "utf8");
console.log("[e2e] Seeded contributor manage room:", vaultRoot);
console.log("[e2e] Manage URL written to e2e/.contrib-manage-url");
