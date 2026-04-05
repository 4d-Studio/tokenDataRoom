import { BlobVaultStorage } from "@/lib/dataroom/blob-storage";
import { LocalVaultStorage } from "@/lib/dataroom/local-storage";
import { isS3VaultConfigured, S3VaultStorage } from "@/lib/dataroom/s3-vault-storage";

type VaultStorage = BlobVaultStorage | S3VaultStorage | LocalVaultStorage;

let storage: VaultStorage | undefined;

export type StorageMode = "blob" | "s3" | "local";

export const getStorageMode = (): StorageMode => {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "blob";
  if (isS3VaultConfigured()) return "s3";
  return "local";
};

export const getVaultStorage = () => {
  if (!storage) {
    if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      if (isS3VaultConfigured() && process.env.NODE_ENV === "production") {
        console.warn(
          "[storage] BLOB_READ_WRITE_TOKEN is set, so Vercel Blob is used for vault files. S3/Railway Bucket env vars are ignored. Remove BLOB_READ_WRITE_TOKEN if you intend to use Railway Bucket.",
        );
      }
      storage = new BlobVaultStorage();
    } else if (isS3VaultConfigured()) {
      storage = new S3VaultStorage();
      if (process.env.NODE_ENV === "production") {
        console.info("[storage] Using S3-compatible bucket (e.g. Railway Bucket) for vault files.");
      }
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
