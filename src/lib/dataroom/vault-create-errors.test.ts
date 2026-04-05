import { describe, expect, it, vi } from "vitest";

import { AUTH_STATE_TABLE_MISSING_MARKER } from "@/lib/dataroom/auth-state-errors";
import { vaultCreateFailureResponse } from "@/lib/dataroom/vault-create-errors";

describe("vaultCreateFailureResponse", () => {
  it("maps auth-state table missing (stable marker)", () => {
    const { status, body } = vaultCreateFailureResponse(
      new Error(`PostgreSQL table public.tkn_auth_state is missing (${AUTH_STATE_TABLE_MISSING_MARKER}).`),
    );
    expect(status).toBe(503);
    expect(body.code).toBe("AUTH_STATE_TABLE_MISSING");
    expect(body.error).toMatch(/migration/i);
  });

  it("maps missing DATABASE_URL", () => {
    const { status, body } = vaultCreateFailureResponse(
      new Error("No database URL (set DATABASE_URL or POSTGRES_URL)"),
    );
    expect(status).toBe(503);
    expect(body.code).toBe("DATABASE_URL_MISSING");
  });

  it("maps Postgres connectivity", () => {
    const { status, body } = vaultCreateFailureResponse(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    expect(status).toBe(503);
    expect(body.code).toBe("DATABASE_UNAVAILABLE");
  });

  it("maps AWS S3-style errors by name", () => {
    const err = new Error("AccessDenied");
    err.name = "AccessDenied";
    const { status, body } = vaultCreateFailureResponse(err);
    expect(status).toBe(503);
    expect(body.code).toBe("VAULT_STORAGE_S3_ERROR");
    expect(body.error).toMatch(/AccessDenied/);
  });

  it("maps AWS Code property when name missing", () => {
    const { status, body } = vaultCreateFailureResponse({ Code: "InvalidAccessKeyId" });
    expect(status).toBe(503);
    expect(body.code).toBe("VAULT_STORAGE_S3_ERROR");
  });

  it("maps Vercel Blob failures by message", () => {
    const { status, body } = vaultCreateFailureResponse(
      new Error("Vercel Blob upload failed with status 401"),
    );
    expect(status).toBe(503);
    expect(body.code).toBe("VAULT_STORAGE_BLOB_ERROR");
  });

  it("maps disk errors", () => {
    const { status, body } = vaultCreateFailureResponse(new Error("EACCES: permission denied"));
    expect(status).toBe(503);
    expect(body.code).toBe("VAULT_STORAGE_DISK_ERROR");
  });

  it("default branch includes hint when no blob and no s3 env", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BUCKET", "");
    vi.stubEnv("AWS_S3_BUCKET", "");
    vi.stubEnv("ACCESS_KEY_ID", "");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "");
    vi.stubEnv("SECRET_ACCESS_KEY", "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
    vi.stubEnv("ENDPOINT", "");
    vi.stubEnv("AWS_ENDPOINT_URL", "");
    vi.stubEnv("AWS_S3_ENDPOINT", "");

    const { status, body } = vaultCreateFailureResponse(new Error("unexpected"));
    expect(status).toBe(500);
    expect(body.code).toBe("VAULT_CREATE_FAILED");
    expect(body.error).toMatch(/TKN_LOCAL_VAULT_DIR|BLOB_READ_WRITE_TOKEN|S3/i);

    vi.unstubAllEnvs();
  });

  it("default branch omits storage hint when S3 is configured", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BUCKET", "b");
    vi.stubEnv("ACCESS_KEY_ID", "k");
    vi.stubEnv("SECRET_ACCESS_KEY", "s");
    vi.stubEnv("ENDPOINT", "https://example.com");

    const { body } = vaultCreateFailureResponse(new Error("something else"));
    expect(body.code).toBe("VAULT_CREATE_FAILED");
    expect(body.error).not.toMatch(/TKN_LOCAL_VAULT_DIR/);

    vi.unstubAllEnvs();
  });

  it("always returns an error string", () => {
    const { body } = vaultCreateFailureResponse(null);
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(5);
  });
});
