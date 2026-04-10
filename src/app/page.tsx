import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Link2,
  Lock,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

/** Public source repository (README / open distribution). */
const PUBLIC_GITHUB_URL = "https://github.com/4d-Studio/tokenDataRoom";

/** GitHub mark (Lucide does not ship this icon in this version). */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

/* ── Data ──────────────────────────────────────────────────── */

const features = [
  {
    icon: Lock,
    title: "Invite only what matters",
    body: "Share a single room, not your full drive. One link, one password, optional NDA.",
  },
  {
    icon: Shield,
    title: "Encrypt before upload",
    body: "Files are encrypted in the browser with AES-256-GCM. We store ciphertext; your password never reaches our servers.",
  },
  {
    icon: Eye,
    title: "See every open and download",
    body: "Track access, NDA signatures, and file downloads — then revoke or restore the room anytime.",
  },
] as const;

const trustBadges = [
  "Client-side encryption",
  "Optional NDA gate",
  "Open / download audit trail",
  "Revoke access anytime",
  "No full-drive exposure",
] as const;

const steps = [
  {
    num: "01",
    title: "Create a room",
    body: "Name the room, set a password, toggle NDA on or off. Files are encrypted in your browser before upload.",
    icon: Lock,
  },
  {
    num: "02",
    title: "Upload & protect",
    body: "Add files — they're encrypted locally and stored as ciphertext. Recipients never see your workspace or owner controls.",
    icon: ShieldCheck,
  },
  {
    num: "03",
    title: "Share one link, track everything",
    body: "Send the share link and password. Watch opens, signatures, and downloads. Revoke or restore whenever you need to.",
    icon: Link2,
  },
] as const;

const comparisonRows = [
  { label: "File access control", token: true, generic: false, esign: false },
  { label: "Optional NDA gate", token: true, generic: false, esign: true },
  { label: "Open / download tracking", token: true, generic: false, esign: false },
  { label: "Client-side encryption", token: true, generic: false, esign: false },
  { label: "Revoke link instantly", token: true, generic: false, esign: false },
  { label: "Per-envelope pricing", token: false, generic: false, esign: true },
  { label: "Full-drive exposure risk", token: false, generic: true, esign: false },
] as const;

const useCases = [
  {
    title: "Diligence & deals",
    body: "Spin up a room for outsiders in minutes. When the deal moves on, revoke — no folder-permission cleanup across the org.",
  },
  {
    title: "Law firms & counsel",
    body: "Client materials, deal bibles, outside counsel packets: one bounded room instead of shared folders people forgot they had access to.",
  },
  {
    title: "Consultants & fund ops",
    body: "LP updates, portfolio asks, vendor reviews. Share what's needed; keep the rest of the workspace off the table.",
  },
] as const;

const faqItems = [
  {
    q: "Where do files live?",
    a: "Encrypted blobs on our storage (or your S3-compatible bucket). Plaintext stays in the browser; we never receive your room password.",
  },
  {
    q: "What happens when I revoke?",
    a: "The room stops serving files immediately. Recipients can't decrypt new downloads. You can restore the room if the deal comes back.",
  },
  {
    q: "Are you SOC 2 certified?",
    a: "Not yet — we're early. We're upfront about architecture: client-side encryption, revocable links, and honest privacy language instead of compliance theater.",
  },
] as const;

/* ── Fake room mockup for hero right ──────────────────────── */

function HeroMockup() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_28px_rgba(35,31,26,0.08)]">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/40 px-5 py-3.5">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Series A Diligence</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">3 files · 2 viewers · NDA required</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Active
        </span>
      </div>

      {/* Files */}
      <div className="border-b border-[color:var(--tkn-panel-border)] px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Files</p>
        {[
          { name: "cap_table_q4.xlsx", size: "84 KB" },
          { name: "pitch_deck_v3.pdf", size: "2.1 MB" },
          { name: "financial_model.xlsx", size: "340 KB" },
        ].map((f) => (
          <div key={f.name} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-[12px] text-foreground">{f.name}</span>
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground">{f.size}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 border-b border-[color:var(--tkn-panel-border)] px-5 py-3">
        <div className="flex items-center gap-1.5">
          <div className="size-3.5 rounded-sm border border-primary/40 bg-primary/10" />
          <span className="text-[11px] text-foreground">NDA required</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="size-3 text-muted-foreground" />
          <span className="text-[11px] text-foreground">Password protected</span>
        </div>
      </div>

      {/* Activity log */}
      <div className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </p>
        {[
          {
            icon: Eye,
            text: "Sarah opened share page",
            time: "2:14 PM",
            color: "text-muted-foreground",
          },
          {
            icon: ShieldCheck,
            text: "Sarah signed NDA",
            time: "2:15 PM",
            color: "text-[var(--color-accent)]",
          },
          {
            icon: Download,
            text: "David downloaded cap_table.pdf",
            time: "1:42 PM",
            color: "text-muted-foreground",
          },
          {
            icon: Clock,
            text: "Access revoked by owner",
            time: "Yesterday",
            color: "text-destructive",
          },
        ].map((row) => (
          <div key={row.text} className="flex items-start gap-2 py-1.5">
            <row.icon className={`mt-0.5 size-3 shrink-0 ${row.color}`} />
            <span className="flex-1 text-[11px] leading-snug text-foreground">{row.text}</span>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{row.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export default async function Home() {
  const user = await getCurrentUser();
  const workspace = user ? await getCurrentWorkspace() : null;
  const isAuthed = Boolean(user);
  const hasWorkspace = Boolean(workspace);

  const primaryHref = hasWorkspace ? "/workspace" : isAuthed ? "/onboarding" : "/login";
  const primaryLabel = hasWorkspace
    ? "Go to workspace"
    : isAuthed
      ? "Finish setup"
      : "Create a room";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav — sits on main bg ─────────────────────── */}
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 border-b border-[color:var(--tkn-panel-border)]/70 px-5 py-4 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <a
              href={PUBLIC_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Token on GitHub — source repository"
            >
              <GitHubIcon className="size-[1.15rem]" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/pricing">Pricing</Link>
          </Button>
          {isAuthed ? null : (
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero — main bg ────────────────────────────── */}
      <section className="pb-16 pt-10 sm:pb-24 sm:pt-14">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[5fr_6fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Deal rooms for outsiders
            </p>

            <h1 className="mt-3 font-heading text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[2.65rem]">
              Share sensitive files without exposing your whole drive
            </h1>

            <p className="mt-4 max-w-[40rem] text-base leading-relaxed text-[var(--tkn-text-support)] sm:text-lg sm:leading-relaxed">
              Token gives outside counsel, investors, and buyers access to one
              protected room — with optional NDA, password gating, and a clear
              audit trail.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-[0.95rem] font-semibold">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-5 text-[0.95rem]">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>

            <p className="mt-3 text-xs text-[var(--tkn-text-fine)]">
              Free to start. No credit card. Plus from $9.99/mo.
            </p>
          </div>

          <div className="hidden lg:block">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────── */}
      <section className="border-y border-[color:var(--tkn-panel-border)] bg-card/90 py-5 backdrop-blur-[2px]">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8">
            {trustBadges.map((label) => (
              <div key={label} className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-emerald-200/90 bg-emerald-500/10 text-emerald-800 dark:text-emerald-600">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
                <span className="text-[0.8125rem] font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature cards — main bg ───────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card p-5 shadow-[0_2px_28px_rgba(35,31,26,0.06)] sm:p-6"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <Icon className="size-5" strokeWidth={1.65} />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — editorial panel on canvas ─────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background)] py-16 sm:py-24"
      >
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl sm:tracking-[-0.02em]">
              Three steps. No webinar, no sales call, no surprise fourth.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--tkn-text-support)] sm:text-base">
              Client-side encryption, optional NDA, one link — then you’re done.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card p-6 shadow-[0_2px_28px_rgba(35,31,26,0.06)] sm:p-8 lg:p-10">
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
              {steps.map(({ num, title, body, icon: Icon }) => (
                <div
                  key={num}
                  className="flex flex-col rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-card font-semibold tabular-nums tracking-wide text-[color:var(--color-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      {num}
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-lg border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/80 text-muted-foreground">
                      <Icon className="size-4" strokeWidth={1.65} aria-hidden />
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">{body}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-3xl border-t border-dashed border-[color:var(--tkn-panel-border)] pt-8">
              <p className="text-pretty text-center text-sm leading-relaxed text-[var(--tkn-text-support)] sm:text-[0.9375rem]">
                <span className="font-semibold text-foreground">The payoff:</span> you move the deal forward
                without giving anyone a map to the rest of your company — and you shut the door the moment the
                conversation changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison table — main bg ────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Compare
          </p>
          <h2 className="mt-2 text-center font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            How Token compares
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-[var(--tkn-text-support)] sm:text-base">
            Built for controlled file sharing, not full signature workflows or
            internal sync.
          </p>

          <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_28px_rgba(35,31,26,0.06)]">
            <div className="grid grid-cols-4 border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/45">
              <div className="px-4 py-3 text-[11px] font-semibold text-muted-foreground" />
              <div className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                Token
              </div>
              <div className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Shared drives
              </div>
              <div className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                E-sign tools
              </div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-4 border-b border-[color:var(--tkn-panel-border)]/80 last:border-b-0"
              >
                <div className="flex items-center px-4 py-2.5 text-[12.5px] text-foreground">
                  {row.label}
                </div>
                {[row.token, row.generic, row.esign].map((val, i) => (
                  <div key={i} className="flex items-center justify-center px-4 py-2.5">
                    {val ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <X className="size-4 text-muted-foreground/40" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────── */}
      <section className="border-y border-[color:var(--tkn-panel-border)] bg-card py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Use cases
          </p>
          <h2 className="mt-2 text-center font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Built for
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {useCases.map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-6"
              >
                <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — main bg ─────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            FAQ
          </p>
          <h2 className="mt-2 text-center font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Straight answers
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {faqItems.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card p-5 shadow-[0_2px_20px_rgba(35,31,26,0.05)] sm:p-6"
              >
                <p className="text-sm font-semibold text-foreground">{item.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────── */}
      <section className="border-y border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background)] py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 text-center sm:px-8">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ready to share files the right way?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--tkn-text-support)] sm:text-base">
            Free plan, no credit card. Encryption happens in your browser before
            anything leaves your machine.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-[0.95rem] font-semibold">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 text-[0.95rem]">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-[var(--tkn-text-fine)]">
            Free to start · Plus from $9.99/mo
          </p>
        </div>
      </section>

      {/* ── Footer — main bg ──────────────────────────── */}
      <footer className="border-t border-[color:var(--tkn-panel-border)] bg-background">
        <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <BrandMark />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--tkn-text-support)]">
                Password-protected deal rooms for outsiders. Encrypt in the browser, share one link, track every open.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-[var(--tkn-text-support)]">
                <Link href="/pricing" className="hover:text-foreground">
                  Pricing
                </Link>
                <Link href="/#how-it-works" className="hover:text-foreground">
                  How it works
                </Link>
                <Link href="/login" className="hover:text-foreground">
                  Sign in
                </Link>
                <Link href="/new" className="hover:text-foreground">
                  Create a room
                </Link>
              </nav>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Legal</p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-[var(--tkn-text-support)]">
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
                <Link href="/dpa" className="hover:text-foreground">
                  DPA
                </Link>
                <Link href="/terms" className="hover:text-foreground">
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>
          <Separator className="my-8 opacity-60" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--tkn-text-fine)]">
              © {new Date().getFullYear()} Token. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={PUBLIC_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--tkn-text-fine)] hover:text-foreground"
              >
                <GitHubIcon className="size-3.5 shrink-0" />
                Source on GitHub
              </a>
              <p className="text-xs text-[var(--tkn-text-fine)]">
                Built for M&amp;A, legal, and fund ops teams.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
