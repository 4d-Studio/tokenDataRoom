<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Token

Token is a lightweight secure-sharing app for sharing sensitive documents through encrypted, revocable rooms.

## Read this first

1. `docs/agent-stack.md`
2. `skills/filmia/SKILL.md`
3. `src/lib/dataroom/*`
4. `docs/session-memory-2026-03-31.md` (session history)

## Product rules

- Keep the landing page minimal and useful
- Prefer light-mode product UI
- Keep copy short and procedural
- Preserve client-side encryption
- Do not store plaintext passwords
- Do not break owner-link management unless real auth replaces it
- Do not claim GDPR compliance — use accurate language about encryption and user data control

## Hosting

Production runs on **Railway** (`railway.toml`: release `npm run db:migrate`, start `npm run start`). **Vercel is not used for hosting**; `@vercel/blob` is optional **file storage** when no S3-compatible bucket is configured.

## Plan limits (src/lib/dataroom/auth-store.ts PLAN_LIMITS)

| Plan    | Rooms | Files/room | Custom Domain | Board Minutes |
|---------|-------|------------|---------------|---------------|
| Free    | 3     | 10 pooled  | ❌            | ❌            |
| Plus    | ∞     | 500        | ✅            | ❌            |
| Unicorn | ∞     | ∞          | ✅            | ✅            |

Free plan: 10 files total pooled across all 3 rooms. Plus: custom domain included. Unicorn: unlimited + board minutes. Plan limits drive UI gates in CreateVaultForm.

## Working areas

- `src/app/login/page.tsx` — Magic-code login
- `src/app/onboarding/page.tsx` — Workspace creation
- `src/app/workspace/page.tsx` — User workspace
- `src/app/agent/page.tsx` — Agent/system overview
- `src/app/new/page.tsx` — 3-step room creation wizard
- `src/app/s/[slug]/page.tsx` — Recipient access (mobile share viewer in mobile-share-viewer.tsx)
- `src/app/m/[slug]/page.tsx` — Owner controls
- `src/app/api/vaults/*` — Room creation, access control, bundle delivery, and owner actions
- `src/app/workspace/settings/page.tsx` — Branding, NDA template, and delete account
- `src/app/pricing/page.tsx` — 3-tier pricing (Free / Plus $9.99 / Unicorn $99.99)
- `src/app/privacy/page.tsx` — Privacy policy
- `src/app/dpa/page.tsx` — Data Processing Agreement
- `src/app/terms/page.tsx` — Terms of Service

## Key files

- `src/lib/dataroom/auth-store.ts` — user/workspace state, PLAN_LIMITS, deleteUserAccount()
- `src/lib/dataroom/client-crypto.ts` — AES-256-GCM encryption (real, Web Crypto API)
- `src/lib/dataroom/blob-storage.ts` — Vercel Blob vault storage
- `src/lib/dataroom/s3-vault-storage.ts` — S3-compatible vault storage (Railway Bucket, etc.)
- `src/lib/dataroom/local-storage.ts` — Local filesystem vault storage (`.dataroom/` dir)
- `src/lib/dataroom/auth.ts` — high-level auth helpers
- `src/lib/dataroom/postgres-auth-state.ts` — Postgres pool + `tkn_auth_state` reads/writes (`DATABASE_URL`)
- `migrations/*.sql` — schema (applied by `pnpm db:migrate` / Railway release)
- `scripts/db-migrate.mjs` — migration runner
- `src/lib/dataroom/session.ts` — session cookie management (TKN_APP_SECRET)
- `src/lib/dataroom/storage.ts` — getVaultStorage() factory
- `src/lib/dataroom/magic-link.ts` — SendGrid OTP email delivery
- `src/lib/dataroom/access.ts` — vault access token management
- `src/components/dataroom/mobile-share-viewer.tsx` — TikTok-style mobile document viewer (PdfDeckView, ImageDeckView)
- `src/components/dataroom/share-experience.tsx` — recipient share page; uses matchMedia to detect mobile
- `src/components/dataroom/create-vault-form.tsx` — 3-step room creation wizard
- `src/components/dataroom/signature-canvas.tsx` — drawn or typed NDA signatures
- `src/components/dataroom/delete-account-card.tsx` — account deletion UI (type DELETE to confirm)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TKN_APP_SECRET` | Yes (prod) | HMAC signing secret for session and access cookies |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical public URL for `metadataBase`, Open Graph, and **`POST /api/vaults` links in production** (`NODE_ENV=production`). In **`next dev`**, API links use your local host instead — this var is ignored for those URLs so `.env.local` can still point at prod for other uses. |
| `RAILWAY_PUBLIC_DOMAIN` | Auto | Railway hostname. Used in **production** as fallback when `request.url` is internal (e.g. `0.0.0.0:8080`). Ignored in `next dev` for vault links. |
| `SITE_URL` | No | Server-only alternate to `NEXT_PUBLIC_SITE_URL` for production vault-link resolution only. |
| `DATABASE_URL` | No | PostgreSQL URL. Also accepts `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `RAILWAY_DATABASE_URL`. When set, auth/workspace index uses table `public.tkn_auth_state` (create with `pnpm db:migrate`; Railway `releaseCommand` runs this). |
| `BLOB_READ_WRITE_TOKEN` | No | Optional Vercel Blob **only when S3 bucket env is incomplete**. If Railway Bucket vars are set, Blob token is ignored. |
| Railway Bucket | No | `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `ENDPOINT`, `REGION` from Railway Storage — **highest priority** for vault files when complete. |
| `TKN_LOCAL_VAULT_DIR` / `TKN_LOCAL_DATA_ROOT` | No | Local vault directory when neither Blob nor bucket env is configured. |
| `SENDGRID_API_KEY` | No | SendGrid API key for email OTP delivery |
| `SENDGRID_FROM_EMAIL` | No | Verified sender email for OTP codes |

## Naming conventions

- **User type**: `TknUser` (exported from auth-store.ts)
- **Plan type**: `"free" | "plus" | "unicorn"`
- **CSS variables**: `--tkn-*` prefix (e.g., `--tkn-panel-border`, `--tkn-text-support`)
- **Cookie names**: `tkn_session`, `tkn_access_`, `tkn_ws_nda_`
- **Data directory**: `.dataroom/` (gitignored)
- **Encrypted file extension**: `.filmia` (legacy — for backward compat, do not change)
