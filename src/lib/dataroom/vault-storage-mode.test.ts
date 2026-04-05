import { describe, expect, it } from "vitest";

import { getVaultStorageModeFromEnv } from "@/lib/dataroom/vault-storage-mode";

describe("getVaultStorageModeFromEnv", () => {
  it("prefers BLOB_READ_WRITE_TOKEN over S3", () => {
    const mode = getVaultStorageModeFromEnv({
      BLOB_READ_WRITE_TOKEN: "tok",
      BUCKET: "b",
      ACCESS_KEY_ID: "k",
      SECRET_ACCESS_KEY: "s",
      ENDPOINT: "https://s3.example.com",
    } as NodeJS.ProcessEnv);
    expect(mode).toBe("blob");
  });

  it("uses s3 when blob unset and S3 vars complete", () => {
    const mode = getVaultStorageModeFromEnv({
      BLOB_READ_WRITE_TOKEN: "",
      BUCKET: "my-bucket",
      ACCESS_KEY_ID: "key",
      SECRET_ACCESS_KEY: "secret",
      ENDPOINT: "https://storage.railway.app",
    } as NodeJS.ProcessEnv);
    expect(mode).toBe("s3");
  });

  it("falls back to local when blob and S3 incomplete", () => {
    const mode = getVaultStorageModeFromEnv({
      BLOB_READ_WRITE_TOKEN: "",
      BUCKET: "only-bucket",
    } as NodeJS.ProcessEnv);
    expect(mode).toBe("local");
  });

  it("accepts AWS-prefixed credential env aliases", () => {
    const mode = getVaultStorageModeFromEnv({
      AWS_S3_BUCKET: "b",
      AWS_ACCESS_KEY_ID: "k",
      AWS_SECRET_ACCESS_KEY: "s",
      AWS_ENDPOINT_URL: "https://x",
    } as NodeJS.ProcessEnv);
    expect(mode).toBe("s3");
  });
});
