import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { getPublicSiteOrigin, SITE_NAME } from "@/lib/dataroom/public-site";

const canonicalPath = "/simple-data-room";

export const metadata: Metadata = {
  title: `Simple data room — lightweight & fair pricing | ${SITE_NAME}`,
  description:
    "Why Token is a lightweight alternative to heavy virtual data rooms: browser encryption, one bounded room per deal, published pricing — no sales theatre.",
  alternates: { canonical: canonicalPath },
  keywords: [
    "simple data room",
    "lightweight virtual data room",
    "affordable VDR",
    "small deal room",
    "encrypted file sharing",
    "fair pricing data room",
  ],
  openGraph: {
    title: `Simple data room | ${SITE_NAME}`,
    description:
      "A non-pretentious data room: encrypt locally, share one link, manage access in one screen — at fair market prices.",
    url: canonicalPath,
  },
};

const points = [
  "Files encrypt in your browser before upload — we store ciphertext, not your room password.",
  "One share link and one password per room. Optional NDA and in-room document signing when you need them.",
  "Owner tools stay separate: manage files, links, invited emails, uploads, and invites without menu archaeology.",
  "Pricing is on the website: free tier, Personal from $9.95/mo, Pro from $29.95/mo — not “request a quote.”",
  "No claim to replace a full compliance program — we are honest about what we are: a bounded room for outsiders.",
] as const;

export default function SimpleDataRoomPage() {
  const origin = getPublicSiteOrigin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[color:var(--tkn-panel-border)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Philosophy
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          A simple data room for people who don&apos;t want a performance
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--tkn-text-support)]">
          Legacy virtual data rooms are powerful — and heavy: long sales cycles, seat math, and pricing you only see
          after a call.{" "}
          <span className="font-medium text-foreground">{SITE_NAME}</span> is the opposite: a{" "}
          <strong className="font-medium text-foreground">lightweight</strong>,{" "}
          <strong className="font-medium text-foreground">non-pretentious</strong> layer for sharing sensitive files
          with outsiders at a <strong className="font-medium text-foreground">fair market price</strong> you can read
          on the pricing page.
        </p>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          What “simple” means here
        </h2>
        <ul className="mt-4 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-base leading-relaxed text-[var(--tkn-text-support)]">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-emerald-200/80 bg-emerald-500/10 text-emerald-800 dark:text-emerald-600">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Fair market price
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--tkn-text-support)]">
          We charge like software people expect in 2026: a free tier to try the flow, a personal tier for a few
          parallel rooms, and a pro tier when you need unlimited rooms, custom domains, and heavier signing. No
          per-viewer tolls — visitors are unlimited. See numbers on{" "}
          <Link href="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
            pricing
          </Link>
          .
        </p>

        <h2 className="mt-12 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          When to pick something bigger
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--tkn-text-support)]">
          If you need a vendor to run your entire diligence process, watermarking policies across dozens of workstreams,
          or a dedicated success team on retainer, an enterprise VDR may still be the right tool. Token is for teams
          that mostly need a <strong className="font-medium text-foreground">clean box</strong>: encrypt, share, track,
          revoke — without the ceremony.
        </p>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/login">
              Create a room
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/data-room-alternatives">Compare approaches</Link>
          </Button>
        </div>
      </article>

      <footer className="border-t border-[color:var(--tkn-panel-border)] py-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← {SITE_NAME} home
        </Link>
        <span className="mx-2 text-border">·</span>
        <span className="text-xs text-[var(--tkn-text-fine)]">{origin}</span>
      </footer>
    </div>
  );
}
