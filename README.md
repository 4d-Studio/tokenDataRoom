# Token

> Secure, encrypted document sharing rooms for deals, due diligence, and board communications.

Token is a lightweight web app for sharing one sensitive document at a time through a calm, premium room experience. Documents are encrypted client-side with AES-256-GCM before they leave the browser — the server never holds plaintext files or encryption keys.

## Features

| Feature | Description |
|---|---|
| **Client-side AES-256 encryption** | Files are encrypted in the browser with PBKDF2 key derivation. The server never sees passwords or plaintext. |
| **NDA gating** | Require recipients to accept your custom confidentiality agreement before accessing the document. |
| **Access logging** | See when recipients open rooms, accept NDAs, and download files — with timestamps and IP addresses. |
| **Revocable access** | Revoke or reactivate any room link instantly from the owner dashboard. |
| **Drawn or typed signatures** | Recipients can draw their signature or type their name to sign the NDA. |
| **Mobile-first viewer** | TikTok-style full-screen document experience on mobile, with swipeable PDF pages and a bottom-sheet unlock form. |
| **Workspace branding** | Upload your logo to display on shared room pages and in the sidebar. |
| **Custom NDA templates** | Edit your workspace's default NDA agreement with a rich text editor. |
| **Self-serve data deletion** | Delete your account and all associated data from workspace settings at any time. |

## Pricing

| Plan | Price | Rooms | Files/room | Custom Domain | Board Minutes |
|------|--------|-------|------------|---------------|---------------|
| **Free** | $0 forever | 3 | 10 pooled | — | — |
| **Plus** | $9.99/mo | Unlimited | 500 | ✅ | — |
| **Unicorn** | $99.99/mo | Unlimited | Unlimited | ✅ | ✅ |

[See full pricing →](/pricing)

## Architecture

```
Browser (React 19)          Next.js 15 App Router
│                               │
│  AES-256-GCM                 │  API Routes
│  encryptFile(password)        │  /api/vaults/*
└─────────────────────────────►│  /api/workspace/*
                                │
              Local filesystem   │  S3-compatible bucket
              (.dataroom/)      │  (e.g. Railway) or Vercel Blob
```

## Tech Stack

- **Next.js 15** — App Router, Server Components, Route Handlers
- **React 19** — Client Components, hooks, Suspense
- **Tailwind CSS 4** — Utility-first styling with CSS variables
- **Web Crypto API** — Native browser encryption (AES-256-GCM, PBKDF2)
- **Framer Motion** — Animations (mobile bottom sheet, page transitions)
- **Tiptap** — Rich text NDA template editor
- **Zod** — Runtime schema validation
- **Object storage** — Railway Bucket (S3-compatible) or Vercel Blob when configured; else local `.dataroom/` in dev
- **SendGrid** — Transactional email for magic-link login codes

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
git clone https://github.com/Tarzelf/openDataRoom.git
cd openDataRoom
pnpm install
```

### Local Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `TKN_APP_SECRET` | Yes (prod) | Secret used to sign session and access cookies. Generate a long random string. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical site URL for Open Graph / metadata (e.g. `https://token.fyi` or your Railway URL). |
| `DATABASE_URL` | No | PostgreSQL URL for durable auth/workspace state (Railway Postgres). |
| `BLOB_READ_WRITE_TOKEN` | No | Optional Vercel Blob (used only if S3/Railway bucket env is not set). |
| `SENDGRID_API_KEY` | No | SendGrid API key for email delivery. Without it, magic codes print to the console. |
| `SENDGRID_FROM_EMAIL` | No | Verified sender email for OTP delivery. |

---

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Landing page
│   ├── login/                # Magic-code login
│   ├── onboarding/           # Workspace creation
│   ├── workspace/            # User dashboard
│   ├── new/                  # Create room (3-step wizard)
│   ├── pricing/              # 3-tier pricing page
│   ├── s/[slug]/            # Recipient share page
│   ├── m/[slug]/            # Owner management page
│   ├── privacy/             # Privacy policy
│   ├── dpa/                 # Data Processing Agreement
│   ├── terms/               # Terms of Service
│   └── api/                 # Route handlers
│       ├── vaults/           # Vault CRUD, access, events
│       ├── workspace/        # Workspace settings, room deletion
│       ├── auth/             # Login, logout, OTP
│       └── account/          # Account deletion
├── components/
│   ├── ui/                   # shadcn/ui base components
│   └── filmia/               # Product components (to be renamed)
├── lib/
│   ├── filmia/               # Core business logic (to be renamed)
│   │   ├── auth-store.ts    # User/workspace state
│   │   ├── auth.ts           # Auth helpers
│   │   ├── client-crypto.ts # AES-256-GCM encryption
│   │   ├── session.ts        # Cookie session management
│   │   ├── access.ts         # Vault access control
│   │   ├── types.ts          # Zod schemas + TypeScript types
│   │   ├── helpers.ts        # Formatting utilities
│   │   └── storage.ts        # VaultStorage factory
│   └── dataroom/            # Renamed from filmia/
├── hooks/                    # Custom React hooks
└── app/globals.css          # CSS variables, design tokens
```

> **Note:** The `filmia` directory name is a legacy reference. It is being renamed to `dataroom` in an upcoming release.

## Routes

| Path | Description |
|---|---|
| `/` | Public landing page |
| `/login` | Magic-code authentication |
| `/onboarding` | Workspace setup after first login |
| `/workspace` | User's room dashboard |
| `/new` | 3-step room creation wizard |
| `/workspace/settings` | Logo, NDA template, account deletion |
| `/pricing` | 3-tier SaaS pricing |
| `/s/[slug]` | Recipient view (NDA signing + document unlock) |
| `/m/[slug]` | Owner controls (revoke, reactivate, delete) |
| `/privacy` | Privacy Policy |
| `/dpa` | Data Processing Agreement |
| `/terms` | Terms of Service |
| `/agent` | Agent/system overview |

## Security Model

### Encryption

All files are encrypted **client-side** before upload using the Web Crypto API:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key derivation**: PBKDF2 with SHA-256, 250,000 iterations
- **Salt**: 16 random bytes per file (stored base64)
- **IV**: 12 random bytes per file (stored base64)
- **Password**: Never transmitted to the server

```
File → encryptFile(password) → encrypted blob → upload to server
                                    ↓
                         salt + iv + pbkdf2_iterations (stored separately)
```

The server stores only the encrypted blob and the key derivation parameters. Without the password, decryption is computationally infeasible.

### Data Storage

- **Development**: Encrypted blobs stored in `.dataroom/vaults/{slug}/` (local filesystem)
- **Production**: Encrypted blobs in an S3-compatible bucket (e.g. Railway) when those env vars are set; otherwise optional Vercel Blob via `BLOB_READ_WRITE_TOKEN`
- **Auth state**: `.dataroom/auth/state.json` locally, or PostgreSQL table `tkn_auth_state` when `DATABASE_URL` is set (e.g. Railway)
- **Session cookies**: HTTP-only, signed with HMAC-SHA256 using `TKN_APP_SECRET`

## Deployment

### Railway (recommended)

The repo includes [`railway.toml`](./railway.toml): Node 20, `npm run db:migrate` as the release command, `npm run start`, and health check on `/api/health`.

1. Create a [Railway](https://railway.app) project and deploy this repo (GitHub integration or `railway up`).
2. Add **PostgreSQL** and set `DATABASE_URL` (migrations run on deploy).
3. Set at least `TKN_APP_SECRET` (e.g. `openssl rand -hex 32`), `NEXT_PUBLIC_SITE_URL` or `SITE_URL` to your public origin, and optional SendGrid vars for email.
4. For file storage, prefer **Railway Bucket** (S3-compatible env vars: `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `ENDPOINT`, `REGION`) — see `AGENTS.md` for priority order.

You do **not** need Vercel to host the app.

### Optional: Vercel Blob (storage only)

If you are not using an S3-compatible bucket, you can store encrypted vault files in **Vercel Blob** by setting `BLOB_READ_WRITE_TOKEN` from the Vercel Blob dashboard. This is **object storage only**, not application hosting.

### Docker (self-hosted)

```bash
docker build -t token .
docker run -p 3000:3000 \
  -e TKN_APP_SECRET=your-secret-here \
  -e SENDGRID_API_KEY=SG.xxx \
  -e SENDGRID_FROM_EMAIL=you@example.com \
  token
```

The app runs in local storage mode without `BLOB_READ_WRITE_TOKEN`.

---

## Contributing

Contributions are welcome. Please read the [AGENTS.md](./AGENTS.md) for development guidelines.

## License

MIT
