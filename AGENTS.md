<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Filmia

Filmia is a lightweight secure-sharing app for one document room at a time.

## Read this first

1. `docs/agent-stack.md`
2. `skills/filmia/SKILL.md`
3. `src/lib/filmia/*`

## Product rules

- Keep the landing page minimal and useful
- Prefer light-mode product UI
- Keep copy short and procedural
- Preserve client-side encryption
- Do not store plaintext passwords
- Do not break owner-link management unless real auth replaces it

## Working areas

- `src/app/login/page.tsx`
  Magic-code login
- `src/app/onboarding/page.tsx`
  Workspace creation
- `src/app/workspace/page.tsx`
  User workspace
- `src/app/agent/page.tsx`
  Agent-facing system overview
- `src/app/new/page.tsx`
  Sender creation flow
- `src/app/s/[slug]/page.tsx`
  Recipient access
- `src/app/m/[slug]/page.tsx`
  Owner controls
- `src/app/api/vaults/*`
  Room creation, access control, bundle delivery, and owner actions
