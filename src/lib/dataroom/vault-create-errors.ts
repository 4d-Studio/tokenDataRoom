import { isS3VaultConfigured } from "@/lib/dataroom/s3-vault-storage";

/**
 * Map vault creation failures to safe API responses (no secrets / stack in body).
 */

function awsErrorName(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  if ("name" in err && typeof (err as { name: unknown }).name === "string") {
    return (err as { name: string }).name;
  }
  return undefined;
}

export type VaultCreateErrorBody = {
  error: string;
  code?: string;
};

/**
 * Turn an thrown error from POST /api/vaults into HTTP status + JSON body.
 */
export function vaultCreateFailureResponse(err: unknown): {
  status: number;
  body: VaultCreateErrorBody;
} {
  const message = err instanceof Error ? err.message : String(err);
  const name = awsErrorName(err);

  if (message.includes("tkn_auth_state is missing")) {
    return {
      status: 503,
      body: {
        code: "AUTH_STATE_TABLE_MISSING",
        error:
          "Database migration has not been applied. In Railway, add a release phase: pnpm db:migrate (or run SQL in migrations/001_tkn_auth_state.sql on your Postgres).",
      },
    };
  }

  if (message.includes("No database URL")) {
    return {
      status: 503,
      body: {
        code: "DATABASE_URL_MISSING",
        error:
          "Server is missing DATABASE_URL (or POSTGRES_URL). Link the Railway Postgres plugin and redeploy.",
      },
    };
  }

  if (
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("getaddrinfo") ||
    message.includes("password authentication failed")
  ) {
    return {
      status: 503,
      body: {
        code: "DATABASE_UNAVAILABLE",
        error:
          "Could not reach PostgreSQL. Check DATABASE_URL, network access, and that the database service is running.",
      },
    };
  }

  const s3Names = new Set([
    "AccessDenied",
    "InvalidAccessKeyId",
    "SignatureDoesNotMatch",
    "NoSuchBucket",
    "PermanentRedirect",
    "NetworkingError",
    "TimeoutError",
  ]);
  if (name && s3Names.has(name)) {
    return {
      status: 503,
      body: {
        code: "VAULT_STORAGE_S3_ERROR",
        error: `Object storage (${name}) rejected the write. Verify BUCKET, ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, and REGION for your Railway Bucket. If TKN_S3_FORCE_PATH_STYLE is required, set it to true.`,
      },
    };
  }

  if (
    message.includes("BLOB_") ||
    message.includes("blob.vercel-storage") ||
    message.includes("Vercel Blob")
  ) {
    return {
      status: 503,
      body: {
        code: "VAULT_STORAGE_BLOB_ERROR",
        error:
          "Vercel Blob upload failed. Check BLOB_READ_WRITE_TOKEN, or remove it to use Railway Bucket (S3 env vars) instead.",
      },
    };
  }

  if (message.includes("EACCES") || message.includes("EROFS") || message.includes("ENOSPC")) {
    return {
      status: 503,
      body: {
        code: "VAULT_STORAGE_DISK_ERROR",
        error:
          "Could not write vault files to disk. On Railway, configure S3-compatible bucket env vars or set TKN_LOCAL_VAULT_DIR to a mounted volume.",
      },
    };
  }

  const hint =
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || isS3VaultConfigured()
      ? ""
      : " Configure a Railway Bucket (S3 env vars), BLOB_READ_WRITE_TOKEN, or a writable TKN_LOCAL_VAULT_DIR.";

  return {
    status: 500,
    body: {
      code: "VAULT_CREATE_FAILED",
      error: `Token could not create the room right now.${hint}`.trim(),
    },
  };
}
