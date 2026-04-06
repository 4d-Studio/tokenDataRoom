import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultFileEntry,
  VaultRecord,
} from "@/lib/dataroom/types";

/**
 * Writable directory for encrypted vault payloads when not using Vercel Blob.
 * - Default: `<cwd>/.dataroom/vaults` (local dev)
 * - `TKN_LOCAL_VAULT_DIR`: absolute path to the vaults root (each slug is a subfolder)
 * - `TKN_LOCAL_DATA_ROOT`: parent of `vaults` (same layout as `.dataroom`)
 * - On Railway without `BLOB_READ_WRITE_TOKEN`: `/tmp/token-dataroom/vaults` (ephemeral but writable)
 */
export function vaultDataRoot(): string {
  const explicitVaults = process.env.TKN_LOCAL_VAULT_DIR?.trim();
  if (explicitVaults) {
    return path.resolve(explicitVaults);
  }
  const dataBase =
    process.env.TKN_LOCAL_DATA_ROOT?.trim() ||
    (Boolean(process.env.RAILWAY_ENVIRONMENT) && !process.env.BLOB_READ_WRITE_TOKEN?.trim()
      ? path.join("/tmp", "token-dataroom")
      : path.join(process.cwd(), ".dataroom"));
  return path.join(path.resolve(dataBase), "vaults");
}

const vaultRoot = (slug: string) => path.join(vaultDataRoot(), slug);
const metadataPath = (slug: string) => path.join(vaultRoot(slug), "metadata.json");
const payloadPath = (slug: string) => path.join(vaultRoot(slug), "payload.bin");
const eventsPath = (slug: string) => path.join(vaultRoot(slug), "events.json");
const acceptancesPath = (slug: string) => path.join(vaultRoot(slug), "acceptances.json");
const filePath = (slug: string, fileId: string) =>
  path.join(vaultRoot(slug), "files", `${fileId}.bin`);
const filesDir = (slug: string) => path.join(vaultRoot(slug), "files");

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

export class LocalVaultStorage {
  async saveVault(metadata: VaultRecord, _encryptedFile: Buffer | null) {
    // Encrypted files are now stored individually via addVaultFile; metadata.vaultFiles tracks them.
    await mkdir(vaultRoot(metadata.slug), { recursive: true });
    await Promise.all([
      writeFile(metadataPath(metadata.slug), JSON.stringify(metadata, null, 2), "utf8"),
      writeFile(eventsPath(metadata.slug), JSON.stringify([], null, 2), "utf8"),
      writeFile(acceptancesPath(metadata.slug), JSON.stringify([], null, 2), "utf8"),
    ]);
  }

  async addVaultFile(
    slug: string,
    fileId: string,
    encryptedBytes: Buffer,
    _metadata: VaultRecord,
  ) {
    await mkdir(filesDir(slug), { recursive: true });
    await writeFile(filePath(slug, fileId), encryptedBytes);
  }

  async getVaultFile(slug: string, fileId: string): Promise<Buffer | null> {
    try {
      return await readFile(filePath(slug, fileId));
    } catch {
      return null;
    }
  }

  async deleteVaultFile(slug: string, fileId: string): Promise<void> {
    await rm(filePath(slug, fileId), { force: true });
  }

  async putEncryptedPayload(slug: string, encryptedFile: Buffer) {
    await mkdir(vaultRoot(slug), { recursive: true });
    await writeFile(payloadPath(slug), encryptedFile);
  }

  async getVaultMetadata(slug: string) {
    return readJson<VaultRecord>(metadataPath(slug));
  }

  async updateVaultMetadata(metadata: VaultRecord) {
    await mkdir(vaultRoot(metadata.slug), { recursive: true });
    await writeFile(metadataPath(metadata.slug), JSON.stringify(metadata, null, 2), "utf8");
  }

  async getEncryptedFile(slug: string) {
    try {
      return await readFile(payloadPath(slug));
    } catch {
      return null;
    }
  }

  async getEvents(slug: string) {
    return (await readJson<VaultEvent[]>(eventsPath(slug))) ?? [];
  }

  async appendEvent(slug: string, event: VaultEvent) {
    const current = await this.getEvents(slug);
    current.unshift(event);
    await writeFile(eventsPath(slug), JSON.stringify(current, null, 2), "utf8");
  }

  async getAcceptances(slug: string) {
    return (await readJson<VaultAcceptanceRecord[]>(acceptancesPath(slug))) ?? [];
  }

  async getAcceptance(slug: string, acceptanceId: string) {
    const current = await this.getAcceptances(slug);
    return current.find((acceptance) => acceptance.id === acceptanceId) ?? null;
  }

  async saveAcceptance(slug: string, acceptance: VaultAcceptanceRecord) {
    const current = await this.getAcceptances(slug);
    current.unshift(acceptance);
    await writeFile(acceptancesPath(slug), JSON.stringify(current, null, 2), "utf8");
  }

  async deleteVault(slug: string) {
    await rm(vaultRoot(slug), { recursive: true, force: true });
  }

  async listVaultsForWorkspace(workspaceId: string): Promise<VaultRecord[]> {
    const root = vaultDataRoot();
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch {
      return [];
    }
    const vaults: VaultRecord[] = [];
    for (const slug of entries) {
      const meta = await this.getVaultMetadata(slug);
      if (meta?.workspaceId === workspaceId) {
        vaults.push(meta);
      }
    }
    return vaults;
  }
}
