# Filmia Repo Skill

Use this skill when working on the Filmia app in this repository.

## Product purpose

Filmia is a lightweight secure-sharing product for sending one sensitive document through a password-protected room with optional NDA gating.

## UX direction

- Prefer light mode
- Prefer small, calm interfaces over marketing treatment
- Use short copy and normal-sized headings
- Avoid decorative gradients, stacked cards, or dramatic hero compositions
- Favor procedural clarity over brand theatrics

## Key routes

- `/`
  Minimal get-started landing page
- `/login`
  Magic-code login
- `/onboarding`
  Workspace creation
- `/workspace`
  User workspace
- `/new`
  Sender room creation
- `/s/[slug]`
  Recipient access
- `/m/[slug]?key=...`
  Owner controls
- `/agent`
  Agent-facing system overview

## Non-negotiable constraints

- Encryption stays client-side
- Passwords are never stored plaintext
- NDA gating remains optional
- Owner controls must keep revoke and restore available

## Where to look first

- `AGENTS.md`
- `docs/agent-stack.md`
- `src/lib/filmia/*`
- `src/app/api/vaults/*`
