import { describe, expect, it } from "vitest";

import { getVaultStorageModeFromEnv } from "@/lib/dataroom/vault-storage-mode";

function fakeEnv(partial: Record<string, string>): NodeJS.ProcessEnv {
  return { ...partial, NODE_ENV: "test" } as NodeJS.ProcessEnv;
}

describe("getVaultStorageModeFromEnv", () => {
  it("prefers S3 over BLOB_READ_WRITE_TOKEN when both are set (Railway Bucket wins)", () => {
    const mode = getVaultStorageModeFromEnv(
      fakeEnv({
        BLOB_READ_WRITE_TOKEN: "tok",
        BUCKET: "b",
        ACCESS_KEY_ID: "k",
        SECRET_ACCESS_KEY: "s",
        ENDPOINT: "https://s3.example.com",
      }),
    );
    expect(mode).toBe("s3");
  });

  it("uses blob when S3 incomplete but token set", () => {
    const mode = getVaultStorageModeFromEnv(
      fakeEnv({
        BLOB_READ_WRITE_TOKEN: "tok",
        BUCKET: "only-name",
      }),
    );
    expect(mode).toBe("blob");
  });

  it("uses s3 when blob unset and S3 vars complete", () => {
    const mode = getVaultStorageModeFromEnv(
      fakeEnv({
        BLOB_READ_WRITE_TOKEN: "",
        BUCKET: "my-bucket",
        ACCESS_KEY_ID: "key",
        SECRET_ACCESS_KEY: "secret",
        ENDPOINT: "https://storage.railway.app",
      }),
    );
    expect(mode).toBe("s3");
  });

  it("falls back to local when blob and S3 incomplete", () => {
    const mode = getVaultStorageModeFromEnv(
      fakeEnv({
        BLOB_READ_WRITE_TOKEN: "",
        BUCKET: "only-bucket",
      }),
    );
    expect(mode).toBe("local");
  });

  it("accepts AWS-prefixed credential env aliases", () => {
    const mode = getVaultStorageModeFromEnv(
      fakeEnv({
        AWS_S3_BUCKET: "b",
        AWS_ACCESS_KEY_ID: "k",
        AWS_SECRET_ACCESS_KEY: "s",
        AWS_ENDPOINT_URL: "https://x",
      }),
    );
    expect(mode).toBe("s3");
  });
});
