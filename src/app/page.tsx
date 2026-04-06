import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductPageIntro } from "@/components/dataroom/product-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

const useCases = [
  {
    title: "Due diligence",
    description:
      "One room per workstream—outside counsel and investors get only what you send, not your whole drive.",
  },
  {
    title: "Board communications",
    description: "Secure links, signed acknowledgements when you need them, and a trail without a heavy portal.",
  },
  {
    title: "Deal rooms",
    description: "Password + optional NDA, then documents. Revoke the room when the deal moves on.",
  },
];

const comparedTo = [
  {
    label: "Dropbox, Box, and shared drives",
    body: "Built for internal sync and folders. Token is for time-boxed, external sharing—NDA, password, revoke—without opening your whole library.",
  },
  {
    label: "DocuSign-style e-sign platforms",
    body: "Purpose-built for legal contracts and priced that way. When you only need “agree, then view the materials,” Token stays minimal and affordable.",
  },
] as const;

const trustItems = [
  { icon: Lock, label: "AES-256 encrypted files" },
  { icon: ShieldCheck, label: "Client-side encryption" },
];

export default async function Home() {
  const user = await getCurrentUser();
  const workspace = user ? await getCurrentWorkspace() : null;
  const isAuthed = Boolean(user);
  const hasWorkspace = Boolean(workspace);

  return (
    <main className="page-shell">
      <header className="page-header">
        <BrandMark />
        <nav className="tkn-support flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          {hasWorkspace ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/workspace">Workspace</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/new">New room</Link>
              </Button>
            </>
          ) : isAuthed ? (
            <Button asChild size="sm">
              <Link href="/onboarding">Continue setup</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </nav>
      </header>

      <section className="page-hero max-w-4xl">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[0.78rem]">
            Secure data rooms
          </Badge>
          <ProductPageIntro
            title="Secure rooms for deals—not another company drive."
            description="Password-protected rooms with optional NDA. Files are encrypted in your browser before upload; you get a clear activity trail and can revoke access anytime. Lighter and cheaper than wiring Dropbox or Box for outsiders, or paying e-sign suites when all you need is acknowledge-and-view."
            className="mt-3 max-w-3xl items-start py-0"
            titleClassName="mt-0 text-[2.05rem] sm:text-[2.35rem]"
            descriptionClassName="max-w-2xl text-[0.9375rem] leading-7 text-[var(--tkn-text-support)]"
          />

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--tkn-text-support)]">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            {hasWorkspace ? (
              <Button asChild size="lg" className="px-4">
                <Link href="/workspace">
                  Go to workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            ) : isAuthed ? (
              <Button asChild size="lg" className="px-4">
                <Link href="/onboarding">
                  Finish workspace setup
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="px-4">
                <Link href="/login">
                  Create your first room
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            )}
            <p className="tkn-fine mt-2">
              {hasWorkspace
                ? "You are signed in — open your data rooms or create a new one."
                : isAuthed
                  ? "Complete onboarding to create your first room."
                  : "Free to start. No credit card."}
            </p>
          </div>
        </div>
      </section>

      {/* Positioning — no testimonials; plain contrast vs common tools */}
      <section className="mt-10 max-w-4xl rounded-xl border border-border bg-white/80 p-5 shadow-sm">
        <p className="label-title mb-3">Compared to</p>
        <ul className="space-y-4">
          {comparedTo.map((row) => (
            <li key={row.label}>
              <p className="text-sm font-semibold text-foreground">{row.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--tkn-text-support)]">{row.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Use cases */}
      <section className="mt-12 max-w-4xl">
        <div className="label-title mb-4">Built for</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="rounded-xl border border-border bg-white p-4">
              <div className="text-sm font-semibold text-foreground">{useCase.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--tkn-text-support)]">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-10 max-w-4xl" />

      {/* How it works */}
      <section className="max-w-4xl">
        <div className="label-title mb-5">How it works</div>
        <div className="grid gap-5 border-y border-border py-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <div className="label-title">01</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Upload and encrypt
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              Add files (encrypted in your browser first), set a room password, and turn on NDA if you need it.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">02</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Share the private link
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              Send one link—optionally a short custom URL. Recipients never see your workspace or owner controls.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">03</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Track and revoke
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              Activity timeline, signed NDA downloads, revoke or restore when you need to—without another vendor stack.
            </p>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="mt-10 max-w-4xl rounded-2xl border border-border bg-white p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Ready to get started?</p>
        <p className="mt-1 text-sm text-[var(--tkn-text-support)]">
          {hasWorkspace
            ? "Jump back into your workspace or create another room."
            : isAuthed
              ? "Finish setup to create your first secure room."
              : "Straightforward pricing—see how it compares to seats, storage tiers, and per-envelope fees elsewhere. No credit card to start."}
        </p>
        {hasWorkspace ? (
          <Button asChild size="lg" className="mt-4">
            <Link href="/workspace">
              Open workspace
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : isAuthed ? (
          <Button asChild size="lg" className="mt-4">
            <Link href="/onboarding">
              Continue setup
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" className="mt-4">
              <Link href="/login">
                Create a secure room
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-[var(--tkn-text-fine)]">
              <Link href="/pricing" className="font-medium text-foreground underline-offset-4 hover:underline">
                View pricing
              </Link>
            </p>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 max-w-4xl pb-8">
        <Separator className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[var(--tkn-text-fine)]">
            © {new Date().getFullYear()} Token. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-4 text-xs text-[var(--tkn-text-fine)]">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/dpa" className="hover:text-foreground">
              DPA
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
