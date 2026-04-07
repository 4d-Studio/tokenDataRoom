# Security

## Reporting a vulnerability

Report security issues privately (avoid public issues with exploit details). Use the contact options in the app’s privacy/legal pages or your org’s security process if published.

## Secrets and configuration

- **Do not commit** real API keys, database URLs that include passwords, or `TKN_APP_SECRET`. Use `.env.local` locally (gitignored); ship only `.env.example` with placeholders.
- If a secret was committed, **rotate it** everywhere and consider rewriting Git history (`git filter-repo`) before calling the repo public.

## Audit / release checklist

- `git ls-files | grep -E '\\.env$|\\.env\\.local'` should list no secret env files (`.env.example` is fine).
- Search for accidental tokens (e.g. `SG.`, `sk_live_`, long random-looking literals).
- Confirm `.gitignore` covers `.env*` except `!.env.example`.
