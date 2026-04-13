import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Fingerprint,
  FolderTree,
  Link2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Token data room plans — free tier, Personal from $9.95/mo, Pro from $29.95/mo with unlimited rooms and document signing.",
  alternates: { canonical: "/pricing" },
};

const annualNote = "Stripe checkout soon — monthly prices shown; annual discounts at launch";

const plans = [
  {
    name: "Free",
    slug: "free" as const,
    comingSoon: false,
    featured: false,
    accent: false,
    priceMonthly: "$0",
    priceAnnual: "$0",
    period: "forever",
    description:
      "Try the full flow: one room, encrypted uploads, optional NDA, and share links. Upgrade when you need your logo and more file capacity.",
    badge: null,
    cta: "Get started",
    ctaHref: "/login",
    features: {
      seats: "Solo",
      rooms: "1 room",
      filesPerRoom: "10 files",
      viewers: "Unlimited",
      ndaGating: true,
      eSignatures: "NDA & acceptance",
      customLogo: false,
      removeBranding: false,
      customDomain: false,
      boardMinutes: false,
      emailSupport: false,
    },
  },
  {
    name: "Personal",
    slug: "plus" as const,
    comingSoon: false,
    featured: false,
    accent: false,
    priceMonthly: "$9.95",
    priceAnnual: "$8.29",
    annualTotalLabel: "~$99/year",
    period: "/month",
    description:
      "One seat, one room — ideal for a single pitch, vendor packet, or diligence bundle. Your logo, no Token branding on the share, up to 500 files.",
    badge: "Checkout soon",
    cta: "Get started",
    ctaHref: "/login",
    features: {
      seats: "1 seat",
      rooms: "1 room",
      filesPerRoom: "500 files",
      viewers: "Unlimited",
      ndaGating: true,
      eSignatures: "Room signing + certificates",
      customLogo: true,
      removeBranding: true,
      customDomain: false,
      boardMinutes: false,
      emailSupport: true,
    },
  },
  {
    name: "Pro",
    slug: "unicorn" as const,
    comingSoon: false,
    featured: true,
    accent: false,
    priceMonthly: "$29.95",
    priceAnnual: "$24.96",
    annualTotalLabel: "~$299/year",
    period: "/month",
    description:
      "Unlimited rooms and files, custom domain, board minutes, and document signing workflows comparable to DocuSign for in-room deals.",
    badge: "Most popular",
    cta: "Get started",
    ctaHref: "/login",
    features: {
      seats: "Team-ready",
      rooms: "Unlimited",
      filesPerRoom: "Unlimited",
      viewers: "Unlimited",
      ndaGating: true,
      eSignatures: "Full signing · DocuSign-class",
      customLogo: true,
      removeBranding: true,
      customDomain: true,
      boardMinutes: true,
      emailSupport: true,
    },
  },
] as const;

const comparisonRows = [
  { key: "seats", label: "Seats" },
  { key: "rooms", label: "Rooms" },
  { key: "filesPerRoom", label: "Files" },
  { key: "viewers", label: "Visitors" },
  { key: "ndaGating", label: "NDA gating" },
  { key: "eSignatures", label: "Document signing" },
  { key: "customLogo", label: "Your logo" },
  { key: "removeBranding", label: "Remove Token branding" },
  { key: "customDomain", label: "Custom domain" },
  { key: "boardMinutes", label: "Board minutes" },
  { key: "emailSupport", label: "Email support" },
] as const;

const includedEverywhere = [
  {
    icon: Lock,
    title: "Client-side encryption",
    body: "AES-256-GCM in the browser before anything touches storage.",
  },
  {
    icon: FolderTree,
    title: "Multi-file rooms",
    body: "Upload many files; organize with owner categories on the manage page.",
  },
  {
    icon: Timer,
    title: "Activity timeline",
    body: "Opens, NDA signatures, downloads, access codes, and decrypt events in one place.",
  },
  {
    icon: Mail,
    title: "Recipient return visits",
    body: "Optional email + code so people can come back without re-signing when allowed.",
  },
  {
    icon: Link2,
    title: "Shorter share links",
    body: "Optional custom paths instead of only auto-generated slugs.",
  },
  {
    icon: Fingerprint,
    title: "Workspace NDA template",
    body: "Edit once in Settings; reuse across rooms that require an NDA.",
  },
] as const;

const faq = [
  {
    q: "Can I change plans later?",
    a: "Yes. When Stripe checkout is live you can move between Free, Personal, and Pro. Until then, new accounts start on Free limits.",
  },
  {
    q: "What counts as a viewer?",
    a: "Anyone who opens your share link. There is no per-viewer fee.",
  },
  {
    q: "How do NDAs work?",
    a: "Turn NDA on per room. Recipients sign in the browser; you download signed PDFs from manage. Customize the template under Workspace settings.",
  },
  {
    q: "Why is Personal limited to one room?",
    a: "Personal is priced for a single active deal (one pitch, one vendor, one diligence set). Pro removes the room cap for teams running many rooms at once.",
  },
  {
    q: "What does “DocuSign-class” mean on Pro?",
    a: "In-room document signing, certificates, and workflows suitable for investor and vendor packets — without the overhead of a full enterprise e-sign suite. Exact quotas ship with billing.",
  },
  {
    q: "What are board minutes?",
    a: "Structured minute-taking inside a room on the Pro plan.",
  },
  {
    q: "Is my data encrypted?",
    a: "Yes. Files are encrypted in your browser before upload. We do not hold your room password or plaintext files.",
  },
  {
    q: "Who owns my data?",
    a: "You do. Delete rooms or your whole account from workspace settings when you want data gone.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-2 text-balance text-[1.75rem] font-bold tracking-[-0.04em] text-foreground sm:text-[2.15rem]">
            Straightforward tiers. Heavyweight outcomes.
          </h1>
          <p className="tkn-support mx-auto mt-3 max-w-xl text-[0.9375rem] leading-relaxed">
            Open, founder-friendly data rooms: encrypted sharing, optional NDAs, and signing that scales on Pro — without
            the per-seat sticker shock of legacy pitch tools.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-xs text-[var(--tkn-text-support)]">
              <ShieldCheck className="size-4 text-[var(--color-accent)]" />
              Encrypted before upload
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--tkn-text-support)]">
              <Sparkles className="size-4 text-[var(--color-accent)]" />
              Free tier · fair paid upgrades
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
            {annualNote}
          </Badge>
        </div>

        {/* Included on every plan */}
        <section className="mt-12 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Included on every plan
          </h2>
                   <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[var(--tkn-text-support)]">
            Core product behavior is the same on every tier — plans mainly differ by seats, room count, file caps, branding,
            domain, and signing depth.
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {includedEverywhere.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-[var(--color-accent)]">
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--tkn-text-support)]">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Plan cards */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              id={
                plan.slug === "plus" ? "plan-personal" : plan.slug === "unicorn" ? "plan-pro" : undefined
              }
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 pt-8 shadow-sm transition-shadow",
                plan.featured &&
                  "z-[1] border-[var(--color-accent)]/35 shadow-[0_8px_30px_rgba(243,91,45,0.12)]",
                plan.accent && !plan.featured && "border-[var(--color-accent)]/25",
                !plan.featured && !plan.accent && "border-border",
              )}
            >
              {plan.badge ? (
                <Badge
                  className={cn(
                    "absolute -top-3 left-1/2 max-w-[90%] -translate-x-1/2 truncate rounded-full px-3 py-0.5 text-[0.65rem] font-semibold",
                    plan.featured
                      ? "border border-[var(--color-accent)]/30 bg-white text-[var(--color-accent)]"
                      : "bg-[var(--color-accent)] text-white",
                  )}
                >
                  {plan.badge}
                </Badge>
              ) : null}

              <div className="flex flex-1 flex-col">
                <div className="label-title text-[0.7rem]">{plan.name}</div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {plan.priceMonthly}
                  </span>
                  <span className="text-sm text-[var(--tkn-text-support)]">{plan.period}</span>
                </div>
                {"annualTotalLabel" in plan ? (
                  <p className="mt-1 text-xs text-[var(--tkn-text-fine)]">
                    ~{plan.priceAnnual}/mo billed annually ({plan.annualTotalLabel})
                  </p>
                ) : null}

                <p className="mt-3 text-sm leading-relaxed text-[var(--tkn-text-support)]">{plan.description}</p>

                <Button asChild variant={plan.featured || plan.accent ? "default" : "outline"} className="mt-6 w-full" size="lg">
                  <Link href={plan.ctaHref}>
                    {plan.cta}
                    <ArrowRight data-icon="inline-end" className="size-4" />
                  </Link>
                </Button>

                <Separator className="my-6" />

                <ul className="flex flex-col gap-2.5 text-sm">
                  {comparisonRows.map(({ key, label }) => {
                    const value = plan.features[key as keyof typeof plan.features];
                    return (
                      <li key={key} className="flex items-start justify-between gap-3">
                        <span className="text-[var(--tkn-text-support)]">{label}</span>
                        <span className="text-right">
                          {typeof value === "boolean" ? (
                            value ? (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Check className="size-4 shrink-0 text-[var(--color-accent)]" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="max-w-[12rem] font-medium text-foreground sm:max-w-none">
                              {value}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table — wide screens */}
        <section className="mt-16">
          <h2 className="text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Compare limits
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-[var(--tkn-text-support)]">
            Same details as the cards — handy for screenshots or finance review.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/35">
                  <th className="py-3 pl-4 text-left font-semibold text-foreground sm:pl-5">Feature</th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={cn(
                        "px-2 py-3 text-center font-semibold sm:px-3",
                        plan.accent ? "text-[var(--color-accent)]" : "text-foreground",
                        plan.featured && "bg-[var(--color-accent)]/[0.06]",
                      )}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map(({ key, label }) => (
                  <tr key={key} className="hover:bg-muted/15">
                    <td className="py-2.5 pl-4 text-[var(--tkn-text-support)] sm:pl-5">{label}</td>
                    {plans.map((plan) => {
                      const value = plan.features[key as keyof typeof plan.features];
                      return (
                        <td
                          key={plan.name}
                          className={cn(
                            "px-2 py-2.5 text-center sm:px-3",
                            plan.featured && "bg-[var(--color-accent)]/[0.04]",
                          )}
                        >
                          {typeof value === "boolean" ? (
                            value ? (
                              <span className="inline-flex items-center justify-center gap-1">
                                <Check className="size-4 text-[var(--color-accent)]" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="font-medium text-foreground">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-muted/25 font-semibold">
                  <td className="py-3 pl-4 text-foreground sm:pl-5">Price</td>
                  {plans.map((plan) => (
                    <td
                      key={plan.name}
                      className={cn("py-3 text-center", plan.featured && "bg-[var(--color-accent)]/[0.06]")}
                    >
                      <>
                        {plan.priceMonthly}
                        <span className="font-normal text-[var(--tkn-text-fine)]"> {plan.period}</span>
                      </>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Common questions
          </h2>
          <div className="mt-8 flex flex-col divide-y divide-border rounded-xl border border-border bg-white px-4 sm:px-6">
            {faq.map((item) => (
              <div key={item.q} className="py-5 first:pt-6 last:pb-6">
                <h3 className="text-sm font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-border pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[var(--tkn-text-fine)]">
              © {new Date().getFullYear()} Token. All rights reserved.
            </p>
            <nav className="flex flex-wrap gap-4 text-xs text-[var(--tkn-text-fine)]">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
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
    </div>
  );
}
