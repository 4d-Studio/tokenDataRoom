import Link from "next/link";
import { Check, ShieldCheck, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const annualNote = "Save 20% with annual billing";

const plans = [
  {
    name: "Free",
    priceMonthly: "$0",
    priceAnnual: "$0",
    period: "forever",
    description: "Enough to get started and share your first deal.",
    badge: null,
    cta: "Start free",
    ctaHref: "/login",
    accent: false,
    features: {
      rooms: "3 rooms",
      filesPerRoom: "10 files",
      viewers: "Unlimited",
      ndaGating: false,
      customLogo: false,
      customDomain: false,
      boardMinutes: false,
      emailSupport: false,
      removeBranding: false,
    },
  },
  {
    name: "Plus",
    priceMonthly: "$9.99",
    priceAnnual: "$7.99",
    period: "/month",
    description: "For professionals who share sensitive documents regularly.",
    badge: null,
    cta: "Start 14-day trial",
    ctaHref: "/login",
    accent: false,
    features: {
      rooms: "Unlimited rooms",
      filesPerRoom: "500 files",
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
    priceMonthly: "$99.99",
    priceAnnual: "$79.99",
    period: "/month",
    description: "For teams that run decisions on consensus and board quorum.",
    badge: "Most popular",
    cta: "Start 14-day trial",
    ctaHref: "/login",
    accent: true,
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
];

const allFeatures = [
  { key: "rooms", label: "Data rooms" },
  { key: "filesPerRoom", label: "Files per room" },
  { key: "viewers", label: "Viewers" },
  { key: "ndaGating", label: "NDA gating" },
  { key: "customLogo", label: "Custom logo" },
  { key: "customDomain", label: "Custom domain" },
  { key: "boardMinutes", label: "Board room minutes" },
  { key: "emailSupport", label: "Email support" },
  { key: "removeBranding", label: "Remove OpenDataRoom branding" },
];

const faq = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade at any time. When you downgrade, your current feature access continues until the end of the billing period.",
  },
  {
    q: "What counts as a viewer?",
    a: "A viewer is any unique recipient who opens your shared link. Recipients who are invited to multiple rooms count separately each time.",
  },
  {
    q: "How does NDA gating work on Plus and Unicorn?",
    a: "Recipients must sign your custom NDA before they can open any document in a room. You can edit the NDA template from your workspace settings.",
  },
  {
    q: "What are board room minutes?",
    a: "A structured minute-taking workspace within each data room. Keep attendance, agenda, and notes for every board or team meeting alongside your sensitive documents.",
  },
  {
    q: "Is my data encrypted?",
    a: "Yes. All files are encrypted client-side before upload. The server never holds your plaintext files or encryption keys.",
  },
  {
    q: "Who owns my data?",
    a: "You do. All files and content you upload remain yours. You can export or permanently delete all your data at any time from your workspace settings.",
  },
  {
    q: "Is there a free trial for Plus and Unicorn?",
    a: "Yes — both paid plans start with a 14-day trial. No credit card required to start.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="page-shell py-16">
        {/* Page intro with trust badges */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, honest pricing.
          </h1>
          <p className="mt-4 text-lg text-[var(--odr-text-support)]">
            Start free. No credit card. Upgrade when you need more.
          </p>

          {/* Trust row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--odr-text-support)]">AES-256 encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-[var(--odr-text-support)]" />
              <span className="text-xs text-[var(--odr-text-support)]">Client-side encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-xs text-[var(--odr-text-support)]">GDPR compliant</span>
            </div>
          </div>
        </div>

        {/* Annual billing toggle note */}
        <div className="mt-6 flex justify-center">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
            {annualNote}
          </Badge>
        </div>

        {/* Plan cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.accent
                  ? "relative border-[var(--color-accent)] bg-white shadow-[0_2px_16px_rgba(243,91,45,0.10)]"
                  : "border-border bg-white"
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-3 py-0.5 text-xs font-semibold text-white">
                  {plan.badge}
                </Badge>
              )}

              <div>
                <div className="label-title">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.priceMonthly}
                  </span>
                  <span className="text-sm text-[var(--odr-text-support)]">{plan.period}</span>
                </div>
                {plan.priceAnnual !== plan.priceMonthly && (
                  <div className="mt-0.5 text-xs text-[var(--odr-text-fine)]">
                    {plan.priceAnnual}/mo billed annually
                  </div>
                )}
                <p className="mt-2 text-sm text-[var(--odr-text-support)]">{plan.description}</p>
              </div>

              <div className="mt-6">
                <Button
                  asChild={plan.ctaHref !== "#"}
                  variant={plan.accent ? "default" : "outline"}
                  className="w-full"
                  size="lg"
                >
                  {plan.ctaHref === "#" ? (
                    <span>{plan.cta}</span>
                  ) : (
                    <Link href={plan.ctaHref}>{plan.cta}</Link>
                  )}
                </Button>
              </div>

              <Separator className="my-5" />

              <div className="flex flex-col gap-3">
                {allFeatures.map(({ key, label }) => {
                  const value = plan.features[key as keyof typeof plan.features];
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-[var(--odr-text-support)]">{label}</span>
                      {typeof value === "boolean" ? (
                        value ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                        ) : (
                          <span className="text-xs text-[var(--odr-text-fine)]">—</span>
                        )
                      ) : (
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Feature comparison table */}
        <div className="mt-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Full feature comparison
          </h2>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-3 pl-5 text-left font-semibold text-foreground">Feature</th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={`py-3 text-center font-semibold ${
                        plan.accent ? "text-[var(--color-accent)]" : "text-foreground"
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allFeatures.map(({ key, label }) => (
                  <tr key={key} className="hover:bg-muted/20">
                    <td className="py-3 pl-5 text-[var(--odr-text-support)]">{label}</td>
                    {plans.map((plan) => {
                      const value = plan.features[key as keyof typeof plan.features];
                      return (
                        <td key={plan.name} className="py-3 text-center">
                          {typeof value === "boolean" ? (
                            value ? (
                              <Check className="mx-auto h-4 w-4 text-[var(--color-accent)]" />
                            ) : (
                              <span className="text-[var(--odr-text-fine)]">—</span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-foreground">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Pricing row */}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-3 pl-5 text-foreground">Monthly price</td>
                  {plans.map((plan) => (
                    <td key={plan.name} className="py-3 text-center text-foreground">
                      {plan.priceMonthly}
                      <span className="font-normal text-[var(--odr-text-fine)]">
                        {" "}{plan.period}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Common questions
          </h2>
          <div className="mt-8 flex flex-col divide-y divide-border">
            {faq.map((item) => (
              <div key={item.q} className="py-5">
                <h3 className="text-sm font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--odr-text-support)]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8">
          <Separator className="mb-6" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[var(--odr-text-fine)]">
              © {new Date().getFullYear()} OpenDataRoom. All rights reserved.
            </p>
            <nav className="flex flex-wrap gap-4 text-xs text-[var(--odr-text-fine)]">
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
    </div>
  );
}
