import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/filmia/brand-mark";

const steps = [
  "Upload one document",
  "Add a password and optional NDA",
  "Share one secure link",
];

const notes = [
  "Password-based client-side encryption",
  "Optional NDA acceptance before access",
  "Owner link for activity and revocation",
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4">
        <BrandMark />
        <nav className="flex items-center gap-5 text-sm text-[var(--color-muted)]">
          <Link href="/agent" className="transition hover:text-[var(--color-foreground)]">
            Agent workspace
          </Link>
          <Link href="/login" className="transition hover:text-[var(--color-foreground)]">
            Login
          </Link>
        </nav>
      </header>

      <section className="grid gap-14 py-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">Get started</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-5xl">
            Protect a document and send it properly.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
            Filmia gives you one clean room for one sensitive file. Add a password,
            require an NDA if needed, and share a link that feels deliberate.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="hero-cta-primary">
              Login to start
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/agent" className="hero-cta-secondary">
              Open agent workspace
            </Link>
          </div>

          <div className="mt-12 grid gap-6 border-t border-[rgba(16,24,40,0.1)] pt-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step}>
                <div className="text-sm font-semibold text-[var(--color-foreground)]">
                  {index + 1}. {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="surface-panel p-6">
          <div className="text-sm font-semibold text-[var(--color-foreground)]">
            Included right now
          </div>
          <div className="mt-5 space-y-4">
            <div className="simple-row">
              <Lock className="h-4 w-4 text-[var(--color-accent)]" />
              {notes[0]}
            </div>
            <div className="simple-row">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              {notes[1]}
            </div>
            <div className="simple-row">
              <ArrowRight className="h-4 w-4 text-[var(--color-accent)]" />
              {notes[2]}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
