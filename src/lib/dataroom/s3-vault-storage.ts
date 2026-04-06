import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

/** Env bag for tests and non-global resolution (Railway Bucket / S3-compatible). */
export type S3EnvSource = Record<string, string | undefined>;

/**
 * Railway Bucket shared vars, or AWS-SDK-style preset (`AWS_ACCESS_KEY_ID`, etc.).
 */
export function readS3BucketEnv(env: S3EnvSource = process.env) {
  const bucket = env.BUCKET?.trim() || env.AWS_S3_BUCKET?.trim();
  const accessKeyId =
    env.ACCESS_KEY_ID?.trim() || env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    env.SECRET_ACCESS_KEY?.trim() || env.AWS_SECRET_ACCESS_KEY?.trim();
  const endpoint =
    env.ENDPOINT?.trim() ||
    env.AWS_ENDPOINT_URL?.trim() ||
    env.AWS_S3_ENDPOINT?.trim();
  const region =
    env.REGION?.trim() ||
    env.AWS_DEFAULT_REGION?.trim() ||
    env.AWS_REGION?.trim() ||
    "auto";
  return { bucket, accessKeyId, secretAccessKey, endpoint, region };
}

function s3Env() {
  return readS3BucketEnv(process.env);
}

/** True when bucket + credentials + endpoint are present (Railway Bucket or compatible S3). */
export function isS3VaultConfiguredFromEnv(env: S3EnvSource = process.env): boolean {
  const e = readS3BucketEnv(env);
  return Boolean(e.bucket && e.accessKeyId && e.secretAccessKey && e.endpoint);
}

export const isS3VaultConfigured = (): boolean => isS3VaultConfiguredFromEnv(process.env);

function createClient(): S3Client {
  const e = s3Env();
  return new S3Client({
    region: e.region,
    endpoint: e.endpoint!,
    credentials: {
      accessKeyId: e.accessKeyId!,
      secretAccessKey: e.secretAccessKey!,
    },
    /**
     * New Railway buckets use virtual-hosted style. Older buckets may need
     * `TKN_S3_FORCE_PATH_STYLE=true` (see your bucket’s Credentials tab).
     */
    forcePathStyle:
      process.env.TKN_S3_FORCE_PATH_STYLE === "true" ||
      process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

function bucketName(): string {
  return s3Env().bucket!;
}

async function readObjectBytes(
  client: S3Client,
  key: string,
): Promise<Buffer | null> {
  try {
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? (e as { name: string }).name : "";
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw e;
  }
}

async function readJson<T>(client: S3Client, key: string): Promise<T | null> {
  const buf = await readObjectBytes(client, key);
  if (!buf) return null;
  return JSON.parse(buf.toString("utf8")) as T;
}

export class S3VaultStorage {
  private readonly client = createClient();

  async saveVault(metadata: VaultRecord, encryptedFile: Buffer | null) {
    const slug = metadata.slug;
    const b = bucketName();
    const writes: Promise<unknown>[] = [
      this.client.send(
        new PutObjectCommand({
          Bucket: b,
          Key: metadataPath(slug),
          Body: JSON.stringify(metadata),
          ContentType: "application/json",
        }),
      ),
      this.client.send(
        new PutObjectCommand({
          Bucket: b,
          Key: eventsPath(slug),
          Body: JSON.stringify([]),
          ContentType: "application/json",
        }),
      ),
      this.client.send(
        new PutObjectCommand({
          Bucket: b,
          Key: acceptancesPath(slug),
          Body: JSON.stringify([]),
          ContentType: "application/json",
        }),
      ),
    ];
    if (encryptedFile) {
      writes.push(
        this.client.send(
          new PutObjectCommand({
            Bucket: b,
            Key: payloadPath(slug),
            Body: encryptedFile,
            ContentType: "application/octet-stream",
          }),
        ),
      );
    }
    await Promise.all(writes);
  }

  async putEncryptedPayload(slug: string, encryptedFile: Buffer) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: payloadPath(slug),
        Body: encryptedFile,
        ContentType: "application/octet-stream",
      }),
    );
  }

  async addVaultFile(
    slug: string,
    fileId: string,
    encryptedBytes: Buffer,
    _metadata: VaultRecord,
  ) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: filePath(slug, fileId),
        Body: encryptedBytes,
        ContentType: "application/octet-stream",
      }),
    );
  }

  async getVaultFile(slug: string, fileId: string): Promise<Buffer | null> {
    return readObjectBytes(this.client, filePath(slug, fileId));
  }

  async deleteVaultFile(slug: string, fileId: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucketName(),
        Key: filePath(slug, fileId),
      }),
    );
  }

  async getVaultMetadata(slug: string) {
    return readJson<VaultRecord>(this.client, metadataPath(slug));
  }

  async updateVaultMetadata(metadata: VaultRecord) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: metadataPath(metadata.slug),
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
      }),
    );
  }

  async getEncryptedFile(slug: string) {
    return readObjectBytes(this.client, payloadPath(slug));
  }

  async getEvents(slug: string) {
    return (await readJson<VaultEvent[]>(this.client, eventsPath(slug))) ?? [];
  }

  async appendEvent(slug: string, event: VaultEvent) {
    const current = await this.getEvents(slug);
    current.unshift(event);
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: eventsPath(slug),
        Body: JSON.stringify(current),
        ContentType: "application/json",
      }),
    );
  }

  async getAcceptances(slug: string) {
    return (
      (await readJson<VaultAcceptanceRecord[]>(this.client, acceptancesPath(slug))) ?? []
    );
  }

  async getAcceptance(slug: string, acceptanceId: string) {
    const current = await this.getAcceptances(slug);
    return current.find((acceptance) => acceptance.id === acceptanceId) ?? null;
  }

  async saveAcceptance(slug: string, acceptance: VaultAcceptanceRecord) {
    const current = await this.getAcceptances(slug);
    current.unshift(acceptance);
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: acceptancesPath(slug),
        Body: JSON.stringify(current),
        ContentType: "application/json",
      }),
    );
  }

  async deleteVault(slug: string) {
    const b = bucketName();
    const keys = [
      metadataPath(slug),
      payloadPath(slug),
      eventsPath(slug),
      acceptancesPath(slug),
    ];
    await Promise.all(
      keys.map((Key) =>
        this.client.send(new DeleteObjectCommand({ Bucket: b, Key })),
      ),
    );
  }

  async listVaultsForWorkspace(workspaceId: string): Promise<VaultRecord[]> {
    const slugSet = new Set<string>();
    let continuationToken: string | undefined;

    do {
      const out = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucketName(),
          Prefix: "vaults/",
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of out.Contents ?? []) {
        const key = obj.Key;
        if (!key) continue;
        const match = key.match(/^vaults\/([^/]+)\/metadata\.json$/);
        if (match) slugSet.add(match[1]);
      }

      continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (continuationToken);

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
