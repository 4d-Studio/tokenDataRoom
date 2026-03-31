import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductPageIntro } from "@/components/dataroom/product-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const useCases = [
  { title: "Due diligence", description: "Share sensitive documents with advisors and investors under NDA protection." },
  { title: "Board communications", description: "Keep your board aligned with secure access, signed receipts, and minutes." },
  { title: "Deal rooms", description: "Create password-protected rooms for every negotiation, with full audit trail." },
];

const trustItems = [
  { icon: Lock, label: "AES-256 encrypted files" },
  { icon: ShieldCheck, label: "Client-side encryption" },
];

export default function Home() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <BrandMark />
        <nav className="odr-support flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Login</Link>
          </Button>
        </nav>
      </header>

      <section className="page-hero max-w-4xl">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[0.78rem]">
            Secure data rooms
          </Badge>
          <ProductPageIntro
            title="Secure data rooms for deals, due diligence, and board communications."
            description="Password-protected rooms with optional NDA gating. Track every view, collect signed agreements, and revoke access instantly — all encrypted end-to-end."
            className="mt-3 max-w-3xl items-start py-0"
            titleClassName="mt-0 text-[2.05rem] sm:text-[2.35rem]"
            descriptionClassName="max-w-2xl text-[0.9375rem] leading-7 text-[var(--odr-text-support)]"
          />

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--odr-text-support)]">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button asChild size="lg" className="px-4">
              <Link href="/login">
                Create your first room
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <p className="odr-fine mt-2">Free to start. No credit card.</p>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="mt-12 max-w-4xl">
        <div className="label-title mb-4">Built for</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="rounded-xl border border-border bg-white p-4">
              <div className="text-sm font-semibold text-foreground">{useCase.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--odr-text-support)]">
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
            <p className="text-sm text-[var(--odr-text-support)]">
              Drop a file, set a password, and choose whether recipients must sign an NDA.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">02</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Share the private link
            </p>
            <p className="text-sm text-[var(--odr-text-support)]">
              Send the room link to your recipient. They'll see only what you allow.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="label-title">03</div>
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              Track and revoke
            </p>
            <p className="text-sm text-[var(--odr-text-support)]">
              See who opened what, download signed NDAs, and revoke access at any moment.
            </p>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="mt-10 max-w-4xl rounded-2xl border border-border bg-white p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Ready to get started?</p>
        <p className="mt-1 text-sm text-[var(--odr-text-support)]">
          Free forever on the starter plan. No credit card required.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/login">
            Create a secure room
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="mt-12 max-w-4xl pb-8">
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
  );
}
