# Filmia Agent Stack

This document exists for incoming agents that need to understand how Filmia is put together quickly.

## Product model

Filmia is a focused secure-sharing app for one document room at a time.

Core flow:

1. User logs in with a magic code
2. User creates a workspace in `/onboarding`
3. Sender uploads one file in `/new`
4. File is encrypted client-side with AES-GCM derived from a password
5. Server stores only encrypted payload plus metadata
6. Recipient opens `/s/[slug]`
7. If required, recipient accepts NDA and receives an access cookie
8. Recipient fetches encrypted bundle and decrypts locally
9. Owner uses `/m/[slug]?key=...` to review activity or revoke room access

## Runtime stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- Web Crypto API in the browser
- Local filesystem storage in development
- Vercel Blob-compatible storage when `BLOB_READ_WRITE_TOKEN` is present

## Main files

- `src/app/page.tsx`
  Minimal get-started landing page
- `src/app/login/page.tsx`
  Magic-code login
- `src/app/onboarding/page.tsx`
  Workspace creation
- `src/app/workspace/page.tsx`
  User workspace
- `src/app/agent/page.tsx`
  Agent-facing system overview
- `src/app/s/[slug]/page.tsx`
  Recipient flow
- `src/app/m/[slug]/page.tsx`
  Owner controls
- `src/app/api/vaults/**`
  Secure-sharing API endpoints
- `src/lib/filmia/client-crypto.ts`
  Browser encryption and decryption helpers
- `src/lib/filmia/storage.ts`
  Storage adapter selector

## MCP integration direction

Filmia does not currently expose an MCP server. If one is added, the first useful tools should be:

- `request_login_code`
- `verify_login_code`
- `create_workspace`
- `create_room`
- `get_room`
- `list_room_events`
- `revoke_room`
- `restore_room`
- `inspect_access_policy`

Those tools should map directly to existing API and storage primitives rather than introducing a parallel business layer.

## Agent safety notes

- Do not move encryption server-side unless the product requirement changes intentionally.
- Do not store plaintext passwords.
- Do not remove the owner management key flow without replacing it with real sender auth.
- Keep the landing page minimal. The product should feel procedural and trustworthy, not theatrical.
