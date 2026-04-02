# Token - Repository Analysis

## What Token Does

Token is a **lightweight secure document sharing app** for sending one sensitive document through a password-protected "room" with optional NDA gating. It's designed to feel like a real data room but simpler.

### Core Flow

1. **User logs in** with a magic code (email OTP)
2. **User creates a workspace** in `/onboarding`
3. **Sender creates a room** in `/new` and uploads one file
4. **File is encrypted client-side** with AES-GCM derived from a password (PBKDF2)
5. **Server stores only the encrypted payload** plus metadata (salt, IV, iterations)
6. **Recipient opens `/s/[slug]`** (the public share link)
7. **If required, recipient accepts NDA** and receives an access cookie
8. **Recipient fetches encrypted bundle and decrypts locally**
9. **Owner uses `/m/[slug]?key=...`** to review activity or revoke room access

### Key Features

- **Client-side encryption** - AES-GCM with PBKDF2 key derivation (Web Crypto API)
- **Magic code login** - Email-based OTP authentication
- **Optional NDA gating** - Room owners can require signed NDAs
- **Activity tracking** - View, download, NDA acceptance, revoke/reactivate events
- **Workspace model** - One workspace per user containing multiple rooms
- **Owner management link** - Separate `/m/[slug]?key=...` for owner controls
- **File type restrictions** - PDF, DOCX, PPTX, XLSX, JPEG, PNG, TXT up to 25MB

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19
- **Styling**: Tailwind CSS 4
- **Encryption**: Web Crypto API (browser-native)
- **Storage**: Local filesystem (dev) or Vercel Blob (production)
- **Auth**: Magic code / email OTP via cookies

## Directory Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx         # Magic-code login
│   ├── onboarding/page.tsx    # Workspace creation
│   ├── workspace/page.tsx     # User dashboard
│   ├── new/page.tsx           # Create room
│   ├── s/[slug]/page.tsx      # Recipient access (public)
│   ├── m/[slug]/page.tsx      # Owner controls (private)
│   ├── agent/page.tsx         # Agent-facing overview
│   └── api/vaults/**          # Secure-sharing API endpoints
├── components/
│   ├── auth/                  # LoginFlow, WorkspaceOnboarding
│   ├── dataroom/                # BrandMark, CopyButton, CreateVaultForm, etc.
│   └── ui/                    # shadcn primitives (Button, Input, Card, etc.)
└── lib/dataroom/
    ├── client-crypto.ts       # encryptFile, decryptFile
    ├── auth.ts                # Session/user/workspace helpers
    ├── auth-store.ts          # In-memory user/workspace storage
    ├── session.ts             # JWT session management
    ├── magic-link.ts          # Magic code generation/verification
    ├── helpers.ts             # Formatting utilities
    ├── types.ts               # TypeScript types and Zod schemas
    ├── signed-nda.ts          # NDA signature handling
    ├── access.ts              # Recipient access logic
    ├── storage.ts             # Storage adapter selector
    ├── blob-storage.ts        # Vercel Blob implementation
    └── local-storage.ts       # Local filesystem implementation
```

## Security Model

- **Passwords never stored** - Only salt, IV, and PBKDF2 iteration count
- **Encryption is client-side** - Server never sees plaintext
- **Owner key in URL** - Management link requires `?key=` query param
- **Session cookies** - HttpOnly, secure, same-site

## UI System

- Light-mode first, calm procedural interfaces
- Manrope font for UI
- Orange accent for primary actions
- shadcn primitives with Token product layer
- Key primitives: `ProductAuthFrame`, `ProductPageIntro`, `ProductSectionCard`, `ProductBreadcrumb`

## Design Principles

- Minimal landing page (not theatrical)
- Short copy and procedural language
- One primary action per surface
- Compact spacing and restrained radius
- Low-contrast chrome
