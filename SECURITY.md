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

## Secret scanning (TruffleHog)

Install [TruffleHog](https://github.com/trufflesecurity/trufflehog) (`brew install trufflehog`), then from the repo root:

```bash
pnpm run secrets:scan
# CI-style: fail only on verified (API-confirmed) leaks:
pnpm run secrets:scan:ci
```

TruffleHog scans **entire git history**. Example-looking connection strings in **old commits** can still appear as *unverified* Postgres detector hits even after you fix `.env.example` on `main`. That is not a live credential if the password was always a placeholder. To remove those commits from what auditors see, use history rewriting (e.g. `git filter-repo`) and force-push **only** after coordinating with anyone who has cloned the repo.

`pnpm run secrets:scan:ci` only fails on **verified** secrets (TruffleHog confirmed valid via a provider). Unverified hits need human review — run `pnpm run secrets:scan` without `:ci` to see them.

### Optional: squash to a clean public tree (new history)

If you want the public repo to have **no prior commits** (e.g. single “initial release” snapshot):

```bash
git checkout --orphan oss-release
git add -A
git status   # review
git commit -m "chore: initial open source release"
git push public oss-release:main --force
git checkout main
git branch -D oss-release
```

Use a new GitHub repo or coordinate with everyone using `public` — **force-push rewrites** the default branch.
