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
      "Give counsel and investors a door—not a map of your entire company drive. One room, one password, done.",
  },
  {
    title: "Board comms",
    description:
      "NDA when you want it, links when you don’t, and a paper trail that didn’t require a committee to buy software.",
  },
  {
    title: "Deal rooms",
    description:
      "Spin up a room, leak nothing you didn’t mean to, kill the link when the vibe shifts. That’s the whole feature.",
  },
];

const comparedTo = [
  {
    label: "Dropbox, Box, the whole “shared folder” industrial complex",
    body: "Love them for internal chaos. Terrible guest list for “please don’t see our cap table.” Token is a room with a bouncer—password, optional NDA, revoke—not another sync client you’ll explain in a Zoom.",
  },
  {
    label: "DocuSign & friends (no shade, they’re just… loud)",
    body: "If you’re closing a merger, pay the merger people. If you need “they agreed, now show the deck,” you don’t need a pricing calculator and three approvals. We’re cheap, small, and fine with that.",
  },
] as const;

const trustItems = [
  { icon: Lock, label: "AES-256 — the keys never touch our nap time" },
  { icon: ShieldCheck, label: "Encrypted in your browser first (actually)" },
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
            Small team energy, big-company paranoia
          </Badge>
          <ProductPageIntro
            title="Data rooms that don’t need a sales call."
            description="Password. Optional NDA. Files encrypted in your browser before they ever hit a server. A timeline of who did what. Revoke the room before your ex-cofounder screenshots the deck. We’re new, we’re lean, and we’re not pretending to be Dropbox with a blazer on."
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
                ? "You’re in. Go break (or fix) something."
                : isAuthed
                  ? "Almost there — name the workspace, then we unleash the rooms."
                  : "Free to start. We’ll ask for money later, when we’re brave enough to turn on checkout."}
            </p>
          </div>
        </div>
      </section>

      {/* Positioning — attitude, not case studies */}
      <section className="mt-10 max-w-4xl rounded-xl border border-border bg-white/80 p-5 shadow-sm">
        <p className="label-title mb-3">Why we exist (rant, abbreviated)</p>
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
        <div className="label-title mb-4">You’ll use this when</div>
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
        <div className="label-title mb-5">Three steps. We’re not hiding a fourth behind a webinar.</div>
        <div className="grid gap-5 border-y border-border py-5 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <div className="label-title">01</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Lock the files in the browser
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              Upload, encrypt locally, pick a password. Flip NDA on if your lawyer texted you at midnight. We never see plaintext.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">02</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Send a link, not a login saga
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              One URL—make it cute with a custom path if you want. They don’t get keys to your workspace; they get the room.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">03</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Watch the chaos, then stop it
            </p>
            <p className="text-sm text-[var(--tkn-text-support)]">
              Timeline of opens, NDAs, downloads, the works. Revoke. Breathe. No new vendor tab to forget the password for.
            </p>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="mt-10 max-w-4xl rounded-2xl border border-border bg-white p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Still here? Good taste.</p>
        <p className="mt-1 text-sm text-[var(--tkn-text-support)]">
          {hasWorkspace
            ? "Your rooms miss you. Or create another and pretend it’s organized."
            : isAuthed
              ? "Finish setup — the empty workspace is judging you silently."
              : "Pricing is honest; the enterprise incumbents are not. Peek at the numbers, then spin up a room. No card."}
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
