import { isS3VaultConfiguredFromEnv } from "@/lib/dataroom/s3-vault-storage";

export type VaultStorageMode = "blob" | "s3" | "local";

/**
 * Pure resolution of which vault backend would be selected (for tests and health checks).
 * Priority: Vercel Blob token → S3-compatible → local disk.
 */
export function getVaultStorageModeFromEnv(
  env: NodeJS.ProcessEnv,
): VaultStorageMode {
  if (env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  if (isS3VaultConfiguredFromEnv(env)) return "s3";
  return "local";
}
