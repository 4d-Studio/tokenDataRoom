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
    "Token data room plans. New accounts include Plus during launch; paid upgrades coming soon.",
};

const annualNote = "Paid checkout coming soon — new accounts get Plus limits today";

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
    description: "Reference tier. Limits below; new sign-ups currently receive Plus caps at no charge.",
    badge: null,
    cta: "Get started",
    ctaHref: "/login",
    features: {
      rooms: "3 rooms",
      filesPerRoom: "10 files total, pooled",
      viewers: "Unlimited",
      ndaGating: true,
      customLogo: true,
      customDomain: false,
      boardMinutes: false,
      emailSupport: false,
      removeBranding: false,
    },
  },
  {
    name: "Plus",
    slug: "plus" as const,
    comingSoon: true,
    featured: true,
    accent: false,
    priceMonthly: "$9.99",
    /** Effective monthly when paying yearly ($96/12). */
    priceAnnual: "$8",
    /** Shown after annual line — total yearly charge. */
    annualTotalLabel: "$96/year",
    period: "/month",
    description:
      "For people who share sensitive files often. Checkout soon — included for new accounts now.",
    badge: "Launch · included now",
    cta: "Get started",
    ctaHref: "/login",
    features: {
      rooms: "Unlimited rooms",
      filesPerRoom: "500 files / room",
      viewers: "Unlimited",
      ndaGating: true,
      customLogo: true,
      customDomain: true,
      boardMinutes: false,
      emailSupport: true,
      removeBranding: false,
    },
  },
  {
    name: "Unicorn",
    slug: "unicorn" as const,
    comingSoon: true,
    featured: false,
    accent: true,
    priceMonthly: "$99.99",
    priceAnnual: "$79.99",
    period: "/month",
    description: "Board workflows, unlimited scale, and white-label polish when you need the full stack.",
    badge: "Coming soon",
    cta: "Get started",
    ctaHref: "/login",
    features: {
      rooms: "Unlimited rooms",
      filesPerRoom: "Unlimited files",
      viewers: "Unlimited",
      ndaGating: true,
      customLogo: true,
      customDomain: true,
      boardMinutes: true,
      emailSupport: true,
      removeBranding: true,
    },
  },
] as const;

const comparisonRows = [
  { key: "rooms", label: "Rooms" },
  { key: "filesPerRoom", label: "Files" },
  { key: "viewers", label: "Viewers" },
  { key: "ndaGating", label: "NDA gating" },
  { key: "customLogo", label: "Workspace logo" },
  { key: "customDomain", label: "Custom domain" },
  { key: "boardMinutes", label: "Board minutes" },
  { key: "emailSupport", label: "Email support" },
  { key: "removeBranding", label: "Remove Token branding" },
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
    a: "Yes. When paid checkout launches, you can move between tiers. Until then, new accounts use Plus-level limits at no charge.",
  },
  {
    q: "What counts as a viewer?",
    a: "Anyone who opens your share link. There is no per-viewer fee on current tiers.",
  },
  {
    q: "How do NDAs work?",
    a: "Turn NDA on per room. Recipients sign in the browser; you download signed PDFs from manage. Customize the template under Workspace settings.",
  },
  {
    q: "What does Free “10 files pooled” mean?",
    a: "Up to 10 encrypted files across all rooms combined (not 10 per room). Upgrade to Plus for 500 files per room.",
  },
  {
    q: "What are board minutes?",
    a: "A structured minute-taking workspace inside a room (Unicorn). Due soon as billing goes live.",
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
            Lighter than Dropbox or Box for deal-by-deal sharing, and far less overhead than full e-sign suites when
            you only need password + optional NDA + a trail you control.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-xs text-[var(--tkn-text-support)]">
              <ShieldCheck className="size-4 text-[var(--color-accent)]" />
              Encrypted before upload
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--tkn-text-support)]">
              <Sparkles className="size-4 text-[var(--color-accent)]" />
              Plus limits today
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
            Product features you get regardless of tier — limits above mainly cap rooms, files, and premium add-ons.
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
              id={plan.slug === "plus" ? "plan-plus" : undefined}
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

                {plan.comingSoon ? (
                  <div className="mt-3">
                    <p className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                      {plan.featured ? "Included" : "Coming soon"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--tkn-text-fine)]">
                      Planned from {plan.priceMonthly}
                      {plan.period}
                      <span>
                        {" "}
                        · {plan.priceAnnual}/mo billed annually
                        {"annualTotalLabel" in plan && plan.annualTotalLabel
                          ? ` (${plan.annualTotalLabel})`
                          : ""}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {plan.priceMonthly}
                    </span>
                    <span className="text-sm text-[var(--tkn-text-support)]">{plan.period}</span>
                  </div>
                )}

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
                    const isSoon =
                      (key === "customDomain" && plan.comingSoon) ||
                      (key === "boardMinutes" && plan.name !== "Unicorn") ||
                      (key === "emailSupport" && plan.comingSoon);
                    return (
                      <li key={key} className="flex items-start justify-between gap-3">
                        <span className="text-[var(--tkn-text-support)]">{label}</span>
                        <span className="text-right">
                          {typeof value === "boolean" ? (
                            value ? (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Check className="size-4 shrink-0 text-[var(--color-accent)]" />
                                {isSoon ? (
                                  <span className="text-[0.65rem] font-normal uppercase tracking-wide text-muted-foreground">
                                    soon
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span className="font-medium text-foreground">{value}</span>
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
                      const isSoon =
                        (key === "customDomain" && plan.comingSoon) ||
                        (key === "boardMinutes" && plan.name !== "Unicorn") ||
                        (key === "emailSupport" && plan.comingSoon);
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
                                {isSoon ? (
                                  <span className="text-[0.65rem] uppercase text-muted-foreground">soon</span>
                                ) : null}
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
                      {plan.comingSoon ? (
                        <span className="text-sm font-medium text-[var(--tkn-text-support)]">See card</span>
                      ) : (
                        <>
                          {plan.priceMonthly}
                          <span className="font-normal text-[var(--tkn-text-fine)]"> {plan.period}</span>
                        </>
                      )}
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
