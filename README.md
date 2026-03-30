# Filmia

Filmia is a single-purpose Next.js app for sharing one sensitive document through a calm, premium room experience.

Core MVP flow:

- Upload one document
- Encrypt it in the browser with a password
- Optionally require NDA acceptance before the encrypted bundle can be fetched
- Share one clean link
- Review basic access activity and revoke the room if needed

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Web Crypto API for client-side AES-GCM encryption
- Local filesystem storage in development
- Vercel Blob-compatible storage in production when `BLOB_READ_WRITE_TOKEN` is configured

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create a local env file if you want production-like behavior:

```bash
cp .env.example .env.local
```

Variables:

- `FILMIA_APP_SECRET`
  Used to sign recipient access cookies after NDA acceptance. Set this in production.
- `BLOB_READ_WRITE_TOKEN`
  Optional. When present, Filmia stores vault metadata and encrypted files in Vercel Blob. Without it, Filmia uses local development storage under `.filmia/`.
- `SENDGRID_API_KEY`
  Optional. When present, Filmia sends login codes by email via SendGrid.
- `SENDGRID_FROM_EMAIL`
  The verified sender email used for magic-code delivery.

## Routes

- `/`
  Landing page
- `/login`
  Magic-code login
- `/onboarding`
  Workspace creation
- `/workspace`
  User workspace
- `/new`
  Create a protected Filmia room
- `/s/[slug]`
  Recipient access page
- `/m/[slug]?key=...`
  Owner management page
- `/agent`
  Agent-facing system overview

## Scripts

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

## Notes

- Passwords are never persisted server-side by Filmia.
- Recipients decrypt files locally in the browser after the NDA gate, if enabled.
- The current MVP is intentionally optimized for one-document sharing instead of a full multi-folder virtual data room.
