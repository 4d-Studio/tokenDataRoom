import { del, get, list, put } from "@vercel/blob";

import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultRecord,
} from "@/lib/dataroom/types";

const metadataPath = (slug: string) => `vaults/${slug}/metadata.json`;
const payloadPath = (slug: string) => `vaults/${slug}/payload.bin`;
const eventsPath = (slug: string) => `vaults/${slug}/events.json`;
const acceptancesPath = (slug: string) => `vaults/${slug}/acceptances.json`;

const readStreamToBuffer = async (stream: ReadableStream<Uint8Array>) => {
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const readJsonBlob = async <T>(pathname: string): Promise<T | null> => {
  const blob = await get(pathname, { access: "private", useCache: false });

  if (!blob || blob.statusCode !== 200) {
    return null;
  }

  const content = await readStreamToBuffer(blob.stream);
  return JSON.parse(content.toString("utf8")) as T;
};

export class BlobVaultStorage {
  async saveVault(metadata: VaultRecord, encryptedFile: Buffer) {
    await Promise.all([
      put(metadataPath(metadata.slug), JSON.stringify(metadata), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
      }),
      put(payloadPath(metadata.slug), encryptedFile, {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/octet-stream",
      }),
      put(eventsPath(metadata.slug), JSON.stringify([]), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
      }),
      put(acceptancesPath(metadata.slug), JSON.stringify([]), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
      }),
    ]);
  }

  async getVaultMetadata(slug: string) {
    return readJsonBlob<VaultRecord>(metadataPath(slug));
  }

  async updateVaultMetadata(metadata: VaultRecord) {
    await put(metadataPath(metadata.slug), JSON.stringify(metadata), {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
  }

  async getEncryptedFile(slug: string) {
    const blob = await get(payloadPath(slug), { access: "private", useCache: false });

    if (!blob || blob.statusCode !== 200) {
      return null;
    }

    return readStreamToBuffer(blob.stream);
  }

  async getEvents(slug: string) {
    return (await readJsonBlob<VaultEvent[]>(eventsPath(slug))) ?? [];
  }

  async appendEvent(slug: string, event: VaultEvent) {
    const current = await this.getEvents(slug);
    current.unshift(event);
    await put(eventsPath(slug), JSON.stringify(current), {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
  }

  async getAcceptances(slug: string) {
    return (await readJsonBlob<VaultAcceptanceRecord[]>(acceptancesPath(slug))) ?? [];
  }

  async getAcceptance(slug: string, acceptanceId: string) {
    const current = await this.getAcceptances(slug);
    return current.find((acceptance) => acceptance.id === acceptanceId) ?? null;
  }

  async saveAcceptance(slug: string, acceptance: VaultAcceptanceRecord) {
    const current = await this.getAcceptances(slug);
    current.unshift(acceptance);
    await put(acceptancesPath(slug), JSON.stringify(current), {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
  }

  async deleteVault(slug: string) {
    await del([
      metadataPath(slug),
      payloadPath(slug),
      eventsPath(slug),
      acceptancesPath(slug),
    ]);
  }

  async listVaultsForWorkspace(workspaceId: string): Promise<VaultRecord[]> {
    const { blobs } = await list({ prefix: "vaults/" });
    const slugSet = new Set<string>();
    for (const blob of blobs) {
      const match = blob.pathname.match(/^vaults\/([^/]+)\/metadata\.json$/);
      if (match) slugSet.add(match[1]);
    }
    const vaults: VaultRecord[] = [];
    for (const slug of slugSet) {
      const meta = await this.getVaultMetadata(slug);
      if (meta?.workspaceId === workspaceId) {
        vaults.push(meta);
      }
    }
    return vaults;
  }
}
