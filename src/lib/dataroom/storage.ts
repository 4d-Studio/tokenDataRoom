import { BlobVaultStorage } from "@/lib/dataroom/blob-storage";
import { LocalVaultStorage } from "@/lib/dataroom/local-storage";
import { isS3VaultConfigured, S3VaultStorage } from "@/lib/dataroom/s3-vault-storage";
import {
  getVaultStorageModeFromEnv,
  type VaultStorageMode,
} from "@/lib/dataroom/vault-storage-mode";

type VaultStorage = BlobVaultStorage | S3VaultStorage | LocalVaultStorage;

let storage: VaultStorage | undefined;

export type StorageMode = VaultStorageMode;

export const getStorageMode = (): StorageMode =>
  getVaultStorageModeFromEnv(process.env);

/** Test-only: clear singleton so `getVaultStorage()` re-reads env. */
export function __resetVaultStorageSingletonForTests(): void {
  storage = undefined;
}

export const getVaultStorage = () => {
  if (!storage) {
    if (isS3VaultConfigured()) {
      storage = new S3VaultStorage();
      if (process.env.NODE_ENV === "production") {
        console.info("[storage] Using S3-compatible bucket (e.g. Railway Bucket) for vault files.");
      }
      if (process.env.BLOB_READ_WRITE_TOKEN?.trim() && process.env.NODE_ENV === "production") {
        console.info(
          "[storage] BLOB_READ_WRITE_TOKEN is set but ignored — S3/Railway Bucket env takes priority.",
        );
      }
    } else if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      storage = new BlobVaultStorage();
    } else {
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "[storage] Using local disk for vault files (no blob token or S3 bucket env). On Railway, vaults default under /tmp unless TKN_LOCAL_VAULT_DIR or a mounted volume is set — files may not survive redeploys.",
        );
      }
      storage = new LocalVaultStorage();
    }
  }

  return storage;
};
