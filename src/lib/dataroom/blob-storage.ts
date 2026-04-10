import { del, get, list, put } from "@vercel/blob";

import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultFileEntry,
  VaultRecord,
} from "@/lib/dataroom/types";

const metadataPath = (slug: string) => `vaults/${slug}/metadata.json`;
const payloadPath = (slug: string) => `vaults/${slug}/payload.bin`;
const eventsPath = (slug: string) => `vaults/${slug}/events.json`;
const acceptancesPath = (slug: string) => `vaults/${slug}/acceptances.json`;
const filePath = (slug: string, fileId: string) => `vaults/${slug}/files/${fileId}.bin`;
const shareBannerPath = (slug: string) => `vaults/${slug}/share-banner.bin`;

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
  async saveVault(metadata: VaultRecord, encryptedFile: Buffer | null) {
    const writes: Promise<unknown>[] = [
      put(metadataPath(metadata.slug), JSON.stringify(metadata), {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
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
    ];
    if (encryptedFile) {
      writes.push(
        put(payloadPath(metadata.slug), encryptedFile, {
          access: "private",
          allowOverwrite: true,
          addRandomSuffix: false,
          contentType: "application/octet-stream",
        }),
      );
    }
    await Promise.all(writes);
  }

  async putEncryptedPayload(slug: string, encryptedFile: Buffer) {
    await put(payloadPath(slug), encryptedFile, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
  }

  async addVaultFile(
    slug: string,
    fileId: string,
    encryptedBytes: Buffer,
    _metadata: VaultRecord,
  ) {
    await put(filePath(slug, fileId), encryptedBytes, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
  }

  async getVaultFile(slug: string, fileId: string): Promise<Buffer | null> {
    const blob = await get(filePath(slug, fileId), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    return readStreamToBuffer(blob.stream);
  }

  async deleteVaultFile(slug: string, fileId: string): Promise<void> {
    await del([filePath(slug, fileId)]);
  }

  async putShareBanner(slug: string, bytes: Buffer) {
    await put(shareBannerPath(slug), bytes, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
  }

  async getShareBanner(slug: string): Promise<Buffer | null> {
    const blob = await get(shareBannerPath(slug), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    return readStreamToBuffer(blob.stream);
  }

  async deleteShareBanner(slug: string): Promise<void> {
    await del([shareBannerPath(slug)]);
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
    // List and delete all objects under the vault prefix (including files/ subdirectory)
    const prefix = `vaults/${slug}/`;
    const toDelete: string[] = [];
    let cursor: string | undefined;
    do {
      const { blobs, cursor: nextCursor } = await list({ cursor, prefix });
      toDelete.push(...blobs.map((b) => b.url));
      cursor = nextCursor;
    } while (cursor);
    if (toDelete.length > 0) {
      await del(toDelete);
    }
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
