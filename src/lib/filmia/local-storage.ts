import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultRecord,
} from "@/lib/filmia/types";

const dataRoot = path.join(process.cwd(), ".filmia", "vaults");

const vaultRoot = (slug: string) => path.join(dataRoot, slug);
const metadataPath = (slug: string) => path.join(vaultRoot(slug), "metadata.json");
const payloadPath = (slug: string) => path.join(vaultRoot(slug), "payload.bin");
const eventsPath = (slug: string) => path.join(vaultRoot(slug), "events.json");
const acceptancesPath = (slug: string) => path.join(vaultRoot(slug), "acceptances.json");

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

export class LocalVaultStorage {
  async saveVault(metadata: VaultRecord, encryptedFile: Buffer) {
    await mkdir(vaultRoot(metadata.slug), { recursive: true });
    await Promise.all([
      writeFile(metadataPath(metadata.slug), JSON.stringify(metadata, null, 2), "utf8"),
      writeFile(payloadPath(metadata.slug), encryptedFile),
      writeFile(eventsPath(metadata.slug), JSON.stringify([], null, 2), "utf8"),
      writeFile(acceptancesPath(metadata.slug), JSON.stringify([], null, 2), "utf8"),
    ]);
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
}
