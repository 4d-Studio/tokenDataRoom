import { BlobVaultStorage } from "@/lib/dataroom/blob-storage";
import { LocalVaultStorage } from "@/lib/dataroom/local-storage";

type VaultStorage = BlobVaultStorage | LocalVaultStorage;

let storage: VaultStorage | undefined;

export const getStorageMode = () =>
  process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";

export const getVaultStorage = () => {
  if (!storage) {
    storage = process.env.BLOB_READ_WRITE_TOKEN
      ? new BlobVaultStorage()
      : new LocalVaultStorage();
  }

  return storage;
};
