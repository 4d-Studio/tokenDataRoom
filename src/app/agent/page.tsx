import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Globe, Server } from "lucide-react";

import { BrandMark } from "@/components/dataroom/brand-mark";
import {
  ProductBreadcrumb,
  ProductPageIntro,
  ProductSectionBody,
  ProductSectionCard,
  ProductSectionHeader,
} from "@/components/dataroom/product-ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Route map",
  description: "Development reference: Token app routes and API surface.",
  robots: { index: false, follow: false },
};

const routes = [
  ["/", "Marketing home · create room entry points"],
  ["/login", "Magic-code login"],
  ["/onboarding", "First-time workspace creation"],
  ["/workspace", "Owner dashboard and room list"],
  ["/new", "Three-step room creation wizard"],
  ["/s/[slug]", "Recipient share page · NDA, decrypt, downloads"],
  ["/m/[slug]?key=…", "Owner panel · links, activity, restrictions"],
  ["/workspace/settings", "Branding, NDA template, plan & limits"],
  ["/pricing", "Public pricing tiers"],
] as const;

const apiRoutes = [
  ["POST", "/api/auth/request-code", "Send magic login OTP email"],
  ["POST", "/api/auth/verify-code", "Verify OTP and set session cookie"],
  ["POST", "/api/workspaces", "Create workspace for the logged-in user"],
  ["POST", "/api/vaults", "Create room (metadata + optional encrypted payload)"],
  ["POST", "/api/vaults/[slug]/payload", "Owner uploads encrypted file (ownerKey + FormData)"],
  ["POST", "/api/vaults/[slug]/access", "Room NDA acceptance → access cookie"],
  ["POST", "/api/vaults/[slug]/workspace-nda", "Workspace NDA + vault + workspace cookies"],
  ["POST", "/api/vaults/[slug]/bootstrap-workspace-access", "Vault cookie from workspace NDA (sibling rooms)"],
  ["POST", "/api/vaults/[slug]/owner", "Owner actions (metadata, invites, restrictions)"],
  ["GET", "/api/vaults/[slug]/bundle", "Encrypted file manifest + blobs after access checks"],
  ["POST", "/api/recipient/login-code", "Recipient OTP request"],
  ["POST", "/api/recipient/verify-code", "Recipient OTP verify → access cookie"],
] as const;

function MethodBadge({ method }: { method: string }) {
  const isGet = method === "GET";
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide",
        isGet
          ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
          : "border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 text-[var(--color-ink)]",
      )}
    >
      {method}
    </Badge>
  );
}

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-border/70 bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandMark />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--tkn-text-support)] transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to site
            </Link>
          </div>
          <ProductBreadcrumb
            items={[
              { href: "/", label: "Home" },
              { label: "Agent / routes" },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-14">
        <ProductPageIntro
          eyebrow="Internal · agents & contributors"
          title="Token system map"
          description="Quick orientation before you change routes or APIs. Not indexed. For full context, read AGENTS.md and docs/agent-stack.md in the repo."
          className="mb-10 max-w-3xl"
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <aside className="flex flex-col gap-4 lg:col-span-1">
            <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-foreground">
                <BookOpen className="size-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold">Read first</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--tkn-text-support)]">
                <li>
                  <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">AGENTS.md</code>
                  <span className="ml-1">— product rules & file map</span>
                </li>
                <li>
                  <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">
                    docs/agent-stack.md
                  </code>
                  <span className="ml-1">— stack & hosting</span>
                </li>
                <li>
                  <code className="rounded bg-[var(--color-background)] px-1.5 py-0.5 text-xs">skills/filmia/SKILL.md</code>
                  <span className="ml-1">— encrypted file format</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-dashed border-border/80 bg-[var(--color-background)] p-5">
              <div className="flex items-center gap-2 text-foreground">
                <Globe className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Deploy</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">
                Production runs on Railway: release runs <code className="text-xs">npm run db:migrate</code>, start{" "}
                <code className="text-xs">npm run start</code>. Health check:{" "}
                <Link href="/api/health" className="font-medium text-primary underline-offset-4 hover:underline">
                  /api/health
                </Link>
                .
              </p>
            </div>
          </aside>

          <div className="flex flex-col gap-5 lg:col-span-2">
            <ProductSectionCard className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm ring-0">
              <ProductSectionHeader
                title="App routes"
                description="User-facing pages in the App Router."
                className="border-b bg-[var(--color-background)]/40"
              />
              <ProductSectionBody className="divide-y divide-border/60 p-0">
                {routes.map(([path, description]) => (
                  <div key={path} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:gap-6">
                    <code className="shrink-0 text-[13px] font-semibold text-foreground">{path}</code>
                    <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                ))}
              </ProductSectionBody>
            </ProductSectionCard>

            <ProductSectionCard className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm ring-0">
              <ProductSectionHeader
                title="API surface"
                description="Representative handlers — verify app/api for the full list."
                className="border-b bg-[var(--color-background)]/40"
                action={
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Server className="size-3.5" />
                    Next.js route handlers
                  </div>
                }
              />
              <ProductSectionBody className="divide-y divide-border/60 p-0">
                {apiRoutes.map(([method, path, description]) => (
                  <div
                    key={`${method}-${path}`}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4"
                  >
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <MethodBadge method={method} />
                      <code className="text-[13px] font-semibold text-foreground">{path}</code>
                    </div>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                ))}
              </ProductSectionBody>
            </ProductSectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}
