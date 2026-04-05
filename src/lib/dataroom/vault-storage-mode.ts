import { isS3VaultConfiguredFromEnv } from "@/lib/dataroom/s3-vault-storage";

export type VaultStorageMode = "blob" | "s3" | "local";

/**
 * Pure resolution of which vault backend would be selected (for tests and health checks).
 * Priority: S3-compatible (e.g. Railway Bucket) → Vercel Blob token → local disk.
 */
export function getVaultStorageModeFromEnv(
  env: NodeJS.ProcessEnv,
): VaultStorageMode {
  if (isS3VaultConfiguredFromEnv(env)) return "s3";
  if (env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  return "local";
}
