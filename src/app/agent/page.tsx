import Link from "next/link";

import { BrandMark } from "@/components/filmia/brand-mark";

const routes = [
  ["/", "Minimal get-started landing page"],
  ["/login", "Magic-code login"],
  ["/onboarding", "Workspace creation"],
  ["/workspace", "User workspace"],
  ["/new", "Create a Filmia room"],
  ["/s/[slug]", "Recipient access page"],
  ["/m/[slug]?key=...", "Owner controls and activity"],
];

const apiRoutes = [
  ["POST /api/auth/request-code", "Request magic code"],
  ["POST /api/auth/verify-code", "Verify code and create session cookie"],
  ["POST /api/workspaces", "Create workspace for the logged-in user"],
  ["POST /api/vaults", "Create room and store encrypted payload"],
  ["POST /api/vaults/[slug]/access", "Record NDA acceptance and issue access cookie"],
  ["GET /api/vaults/[slug]/bundle", "Return encrypted bundle after access checks"],
];

export default function AgentPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4">
        <BrandMark />
        <nav className="flex items-center gap-5 text-sm text-[var(--color-muted)]">
          <Link href="/" className="transition hover:text-[var(--color-foreground)]">
            Back home
          </Link>
          <Link href="/workspace" className="transition hover:text-[var(--color-foreground)]">
            User workspace
          </Link>
        </nav>
      </header>

      <section className="py-12">
        <p className="eyebrow">Agent workspace</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-4xl">
          Filmia system overview
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
          This route is for incoming agents. It summarizes the product flow, API surface,
          and the repo docs that matter before making changes.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="surface-panel p-6">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Routes</h2>
          <div className="mt-5 space-y-4">
            {routes.map(([path, description]) => (
              <div key={path} className="border-b border-[rgba(16,24,40,0.08)] pb-4 last:border-b-0 last:pb-0">
                <div className="text-sm font-semibold text-[var(--color-ink)]">{path}</div>
                <div className="mt-1 text-sm text-[var(--color-muted)]">{description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel p-6">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">API surface</h2>
          <div className="mt-5 space-y-4">
            {apiRoutes.map(([path, description]) => (
              <div key={path} className="border-b border-[rgba(16,24,40,0.08)] pb-4 last:border-b-0 last:pb-0">
                <div className="text-sm font-semibold text-[var(--color-ink)]">{path}</div>
                <div className="mt-1 text-sm text-[var(--color-muted)]">{description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
