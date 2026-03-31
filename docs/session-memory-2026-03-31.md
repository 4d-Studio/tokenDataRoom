# OpenDataRoom — Session Memory: Tuesday March 31, 2026

## What we worked on today

### 1. Mobile Share Viewer (PDF Deck Experience)
- Created `/src/components/dataroom/mobile-share-viewer.tsx` — TikTok/Reels-style full-screen mobile viewer
- Key features built:
  - `PdfDeckView`: Full-screen PDF reader with prev/next page navigation, draggable page scrubber, zoom controls (A−/A+), fullscreen toggle, keyboard nav (arrow keys + F), download button, double-tap to show/hide controls overlay
  - `ImageDeckView`: Same pattern for multi-image "decks"
  - `MobileLockedState`: Animated locked state before decryption
  - `MobileShareViewer`: Draggable bottom sheet (Framer Motion) with NDA signing form and password unlock form
  - Props: `objectUrl` passed in from parent `ShareExperience`
- Updated `/src/components/dataroom/share-experience.tsx` to detect mobile via `window.matchMedia` and render `MobileShareViewer` instead of desktop UI on mobile
- `MobileShareViewer` receives `objectUrl` prop and passes it to `MobileDocumentView`

### 2. SaaS Pricing Plan Adjustments
- Updated `PLAN_LIMITS` in `/src/lib/dataroom/auth-store.ts`:
  - Free: `filesPerRoom: 10` (was 1), `customDomain: false`
  - Plus: `filesPerRoom: 500` (was 100), `customDomain: true` (new)
  - Unicorn: `customDomain: true` (was false — Plus didn't have it)
- Added `customDomain: boolean` to `PlanLimits` type
- Updated `/src/app/pricing/page.tsx`:
  - Free: "10 files" (was "1 file")
  - Plus: "500 files" + "Custom domain" feature row
  - Unicorn: "Most popular" badge + `accent: true` (only highlighted tier)
  - Removed "Most popular" from Plus
  - Added "Custom domain" row to feature comparison table
  - Replaced GDPR FAQ answer with "Who owns my data?" FAQ answer

### 3. Encryption & GDPR Audit
- Ran full codebase audit
- **Encryption (AES-256)**: Real and correctly implemented. `client-crypto.ts` uses Web Crypto API (AES-256-GCM, PBKDF2 250k iterations). Password never leaves browser. Server stores only encrypted blob + key derivation params. Marketing claims are accurate.
- **GDPR gaps found**:
  - No privacy policy page
  - No right to erasure / account deletion
  - IP addresses logged silently in vault events + acceptance records
  - No cookie consent
  - No data retention policy
  - No DPA

### 4. Legal & Compliance Pages Built
Created in parallel:

- **`/src/app/privacy/page.tsx`** — Full privacy policy:
  - Data collected (account, workspace, shared doc metadata, acceptance records, access logs, cookies)
  - Encryption section (clarifies server never sees plaintext)
  - Data retention: active until deletion, backups purged within 30 days
  - Data subject rights (access, deletion, portability, correction)
  - Cookie section (session + access token only; no advertising/analytics cookies)
  - Third-party processors: Vercel, Vercel Blob, SendGrid
  - Security measures, children policy, contact (privacy@dataroom.app)

- **`/src/app/dpa/page.tsx`** — Data Processing Agreement:
  - Processor (OpenDataRoom) vs Controller (user) roles
  - Subject matter, nature, purpose, and duration of processing
  - Personal data types (recipient name/email/company/address, IP, user agent)
  - Special categories: not intentionally processed
  - Security measures (AES-256, TLS, access controls, sub-processor DPAs)
  - Data subject rights assistance
  - Sub-processor table: Vercel Inc., Vercel Blob, Twilio SendGrid (all US)
  - Data breach notification: 72h to Controller
  - Audit rights, return and deletion procedures

- **`/src/app/terms/page.tsx`** — Terms of Service:
  - Acceptance, description of service
  - Account registration (magic-link)
  - Acceptable use (no illegal/infringing content)
  - Your content (you own it; we get limited license to process)
  - Recipients and shared access
  - Fees and billing
  - Service availability (99.9% goal, no SLA guarantee)
  - Termination (account deletion, data removed within 30 days)
  - Disclaimer of warranties ("as is")
  - Limitation of liability (capped at 12 months fees paid)
  - Indemnification
  - Intellectual property
  - Governing law (jurisdiction TBD — placeholder)
  - Contact: legal@dataroom.app

### 5. Landing & Pricing Page Updates
- **`/src/app/page.tsx`**:
  - Removed "GDPR compliant" from `trustItems` (now just "AES-256 encrypted files" + "Client-side encryption")
  - Added footer with copyright, links to Privacy Policy, DPA, Terms
  - Imported `Separator` from shadcn/ui
- **`/src/app/pricing/page.tsx`**:
  - Added footer matching landing page
  - Replaced "Is my data encrypted?" FAQ answer with new messaging
  - Added "Who owns my data?" FAQ answer
  - Removed "Is my data encrypted?" GDPR-specific language

### 6. Cookie Consent Notice
- Created `/src/components/dataroom/cookie-notice.tsx`:
  > "By continuing, you agree to our Terms and Privacy Policy. We use only functional cookies to keep you logged in."
- Added below `ProductAuthFrame` on both `/src/app/login/page.tsx` and `/src/app/onboarding/page.tsx`
- Links to Terms + Privacy Policy

### 7. Account Deletion (User Self-Serve Erasure)
- **`/src/lib/dataroom/auth-store.ts`**:
  - Added `rm` import from `node:fs/promises`
  - Added `deleteUserAccount(userId)` function:
    - Looks up user and workspace
    - Calls `storage.deleteVault(slug)` for every room in workspace (via `listVaultsForWorkspace`)
    - Removes workspace, rooms, workspace guest acceptances from auth state
    - Removes `.dataroom/auth` directory from disk (local mode cleanup)
    - Removes login codes for user's email
    - Removes user from state
    - Writes clean state
    - Returns `true` on success

- **`/src/lib/dataroom/local-storage.ts`**:
  - Added `readdir` import
  - Added `listVaultsForWorkspace(workspaceId)` method: reads all entries in `.dataroom/vaults/`, loads each metadata.json, filters by `workspaceId`

- **`/src/lib/dataroom/blob-storage.ts`**:
  - Added `list` import from `@vercel/blob`
  - Added `listVaultsForWorkspace(workspaceId)` method: uses `list({ prefix: "vaults/" })`, extracts slugs from `metadata.json` paths, fetches each metadata, filters by `workspaceId`

- **`/src/lib/dataroom/auth.ts`**:
  - Added `deleteUserAccount` to imports from `auth-store`
  - Added `export const deleteCurrentUser = async ()` — looks up current user via `getCurrentUser()`, calls `deleteUserAccount(user.id)`

- **`/src/app/api/account/delete/route.ts`** (new):
  - `DELETE` handler
  - Calls `deleteCurrentUser()`
  - Returns 401 if not authenticated
  - Clears session cookie on success
  - Returns `{ deleted: true }`

- **`/src/components/dataroom/delete-account-card.tsx`** (new):
  - Client component with red "danger zone" styling
  - Requires user to type "DELETE" to enable button
  - Shows error if fetch fails
  - Redirects to `/login` on success
  - "Deleting..." loading state

- **`/src/app/workspace/settings/page.tsx`**:
  - Added import for `DeleteAccountCard`
  - Added danger zone card section at bottom of settings page
  - Updated title/description to "Workspace settings"

## File Changes Summary

### Created
- `/src/app/privacy/page.tsx`
- `/src/app/dpa/page.tsx`
- `/src/app/terms/page.tsx`
- `/src/app/api/account/delete/route.ts`
- `/src/components/dataroom/cookie-notice.tsx`
- `/src/components/dataroom/delete-account-card.tsx`
- `/docs/session-memory-2026-03-31.md` (this file)

### Modified
- `/src/components/dataroom/mobile-share-viewer.tsx` — PdfDeckView, ImageDeckView, objectUrl prop
- `/src/components/dataroom/share-experience.tsx` — mobile detection + passes objectUrl
- `/src/lib/dataroom/auth-store.ts` — PLAN_LIMITS (filesPerRoom, customDomain), deleteUserAccount()
- `/src/lib/dataroom/local-storage.ts` — listVaultsForWorkspace, readdir import
- `/src/lib/dataroom/blob-storage.ts` — listVaultsForWorkspace, list import
- `/src/lib/dataroom/auth.ts` — deleteCurrentUser export
- `/src/app/pricing/page.tsx` — plan features, customDomain row, footer, FAQ
- `/src/app/page.tsx` — removed GDPR badge, added footer
- `/src/app/login/page.tsx` — CookieNotice added
- `/src/app/onboarding/page.tsx` — CookieNotice added
- `/src/app/workspace/settings/page.tsx` — DeleteAccountCard added

## Key Architecture Decisions

1. **Client-side encryption is real**: AES-256-GCM + PBKDF2. Server cannot decrypt. Marketing claims are accurate.
2. **Plan limits enforced in auth-store**: `PLAN_LIMITS` constant drives UI gates in `CreateVaultForm`. Free = 10 pooled files across 3 rooms. Plus = 500 files/room + custom domain. Unicorn = unlimited + board minutes.
3. **GDPR removed as claim**: Replaced with accurate privacy policy + DPA + user data control rights.
4. **Account deletion is self-serve**: User can delete everything from `/workspace/settings`. Deletes all rooms, files, acceptances, logs, and user record.
5. **Sub-processors disclosed**: Vercel (hosting), Vercel Blob (storage), SendGrid (email). All in US.
6. **Mobile share experience**: `ShareExperience` uses `window.matchMedia` in `useEffect` to detect mobile and render `MobileShareViewer` — avoids SSR hydration mismatch. PDF decks get prev/next page controls, zoom, fullscreen via iframe `src` with `#page=N` hash.

## Outstanding / Not Done
- Custom domain feature is listed in plan limits but not actually implemented (UI only)
- Board room minutes is in plan limits but not implemented
- No actual Stripe billing integration (plan changes are local state only)
- DPA page has placeholder company details (jurisdiction, legal entity name, etc.)
- Contact email placeholder: privacy@dataroom.app, legal@dataroom.app — need real addresses
