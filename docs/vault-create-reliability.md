# Vault creation reliability (audit)

`POST /api/vaults` must **never** return a bare 500 with no actionable body. Failures are mapped in `vault-create-errors.ts` and covered by Vitest (`pnpm test`).

## Failure domains

| Area | Symptom | `code` (JSON) | Mitigation |
|------|---------|-----------------|------------|
| Postgres migration | Room create fails after login works | `AUTH_STATE_TABLE_MISSING` | Run `pnpm db:migrate` on deploy Postgres (see `migrations/001_tkn_auth_state.sql`). |
| `DATABASE_URL` | Auth / API errors | `DATABASE_URL_MISSING` | Link Railway Postgres; set `DATABASE_URL` or `POSTGRES_URL`. |
| Postgres connectivity | Intermittent failures | `DATABASE_UNAVAILABLE` | Check service status, URL, SSL. |
| Vercel Blob token invalid | Only when S3 is not configured | `VAULT_STORAGE_BLOB_ERROR` | Fix `BLOB_READ_WRITE_TOKEN` or add full S3 env (Railway Bucket wins when both are set). |
| S3 / Railway Bucket | Put denied / wrong endpoint | `VAULT_STORAGE_S3_ERROR` | `BUCKET`, `ENDPOINT`, keys, `REGION`; try `TKN_S3_FORCE_PATH_STYLE=true`. |
| Local disk | EROFS / EACCES on read-only FS | `VAULT_STORAGE_DISK_ERROR` | Set S3 env or `TKN_LOCAL_VAULT_DIR` on a volume. |

## Storage priority (enforced in code + tests)

1. Full S3 env (`BUCKET` + keys + `ENDPOINT`) → **s3** (Railway Bucket). A leftover `BLOB_READ_WRITE_TOKEN` does **not** override S3.
2. Else if `BLOB_READ_WRITE_TOKEN` → **blob** (Vercel Blob).
3. Else → **local** (`/tmp/...` on Railway when no blob/S3).

## Stable markers

- `AUTH_STATE_TABLE_MISSING_MARKER` in `auth-state-errors.ts` is embedded in the Postgres `ensureTable` error and detected by `vaultCreateFailureResponse`. **Do not change the substring** without updating tests.

## Public share / manage URLs (`POST /api/vaults`)

Links must not use `http://0.0.0.0:8080` in production. **`next dev`**: links follow the request host (localhost); `NEXT_PUBLIC_SITE_URL` / `RAILWAY_PUBLIC_DOMAIN` are **not** applied to `POST /api/vaults` responses. **Production**: `getPublicAppBaseUrl()` uses `NEXT_PUBLIC_SITE_URL` or `SITE_URL` → `RAILWAY_PUBLIC_DOMAIN` → `x-forwarded-host` / `host` → `request.url`.

## Operations checklist

1. Set **`NEXT_PUBLIC_SITE_URL`** to your public origin (for example `https://your-app.up.railway.app`) for metadata and API-generated links, or rely on Railway’s **`RAILWAY_PUBLIC_DOMAIN`** + `x-forwarded-*` headers.
2. `GET /api/health` → `database: "connected"`, `authStateTable: "ok"`, `vaultStorage` matches intent (`s3` for Railway Bucket).
3. After deploy, create a **room without file** (metadata-only); expect 200 and links whose host matches your public domain (not `0.0.0.0`).
4. CI: run `pnpm test` then `pnpm build` on every PR (paste the workflow below as `.github/workflows/test.yml` if your Git token has the `workflow` scope, or run locally before deploy).

```yaml
name: test
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
```

## Regression tests (must stay green)

- `vault-create-errors.test.ts` — every mapped error code + default hint behavior.
- `vault-storage-mode.test.ts` — blob vs S3 vs local priority and env aliases.
- `route.test.ts` — 401/400 paths; happy path; **503 + `AUTH_STATE_TABLE_MISSING`** when storage or `recordWorkspaceRoom` throws the marker (no silent 500).
