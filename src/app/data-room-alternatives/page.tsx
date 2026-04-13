import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import { getPublicSiteOrigin, SITE_NAME } from "@/lib/dataroom/public-site";

const canonicalPath = "/data-room-alternatives";

export const metadata: Metadata = {
  title: `Data room alternatives — how ${SITE_NAME} compares`,
  description:
    "Compare lightweight deal rooms to enterprise VDRs, shared drives, ZIP email, and e-sign tools. Token focuses on one job: outsider access with encryption and a clear trail.",
  alternates: { canonical: canonicalPath },
  keywords: [
    "data room alternatives",
    "virtual data room comparison",
    "VDR vs Google Drive",
    "cheap data room",
    "simple VDR",
    "Token vs DocuSign",
  ],
  openGraph: {
    title: `Data room alternatives | ${SITE_NAME}`,
    description:
      "How Token compares to heavy VDRs, shared drives, email attachments, and signature products — by job to be done, not marketing claims.",
    url: canonicalPath,
  },
};

type Cell = "yes" | "partial" | "no";

const rows: { capability: string; token: Cell; enterpriseVdr: Cell; sharedDrive: Cell; zipEmail: Cell; esignOnly: Cell }[] =
  [
    {
      capability: "Purpose-built for “outside counsel / investor” file drops",
      token: "yes",
      enterpriseVdr: "yes",
      sharedDrive: "partial",
      zipEmail: "partial",
      esignOnly: "no",
    },
    {
      capability: "Client-side encryption before upload",
      token: "yes",
      enterpriseVdr: "partial",
      sharedDrive: "no",
      zipEmail: "no",
      esignOnly: "no",
    },
    {
      capability: "One revocable link + password mental model",
      token: "yes",
      enterpriseVdr: "yes",
      sharedDrive: "partial",
      zipEmail: "no",
      esignOnly: "partial",
    },
    {
      capability: "Optional NDA gate on the share page",
      token: "yes",
      enterpriseVdr: "yes",
      sharedDrive: "no",
      zipEmail: "no",
      esignOnly: "partial",
    },
    {
      capability: "In-room document signing (deals, not generic templates)",
      token: "yes",
      enterpriseVdr: "partial",
      sharedDrive: "no",
      zipEmail: "no",
      esignOnly: "yes",
    },
    {
      capability: "Open / download / access trail in one owner view",
      token: "yes",
      enterpriseVdr: "yes",
      sharedDrive: "partial",
      zipEmail: "no",
      esignOnly: "partial",
    },
    {
      capability: "Published pricing without a sales call",
      token: "yes",
      enterpriseVdr: "no",
      sharedDrive: "yes",
      zipEmail: "yes",
      esignOnly: "partial",
    },
    {
      capability: "Lightweight setup (minutes, not projects)",
      token: "yes",
      enterpriseVdr: "partial",
      sharedDrive: "yes",
      zipEmail: "yes",
      esignOnly: "partial",
    },
  ];

const colLabels = [
  { key: "token" as const, label: SITE_NAME },
  { key: "enterpriseVdr" as const, label: "Typical enterprise VDR" },
  { key: "sharedDrive" as const, label: "Shared drive" },
  { key: "zipEmail" as const, label: "ZIP + email" },
  { key: "esignOnly" as const, label: "E-sign product" },
];

function CellIcon({ v }: { v: Cell }) {
  if (v === "yes") return <Check className="mx-auto size-4 text-emerald-600" aria-label="Yes" />;
  if (v === "partial")
    return (
      <span className="mx-auto block w-fit text-[10px] font-semibold uppercase tracking-wide text-amber-800/90 dark:text-amber-400">
        Mixed
      </span>
    );
  return <X className="mx-auto size-4 text-muted-foreground/45" aria-label="No" />;
}

export default function DataRoomAlternativesPage() {
  const origin = getPublicSiteOrigin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[color:var(--tkn-panel-border)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/simple-data-room">Simple data room</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Compare
        </p>
        <h1 className="mt-2 max-w-3xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Data room alternatives: what you&apos;re actually choosing
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--tkn-text-support)]">
          Products get lumped together as “data rooms.” In practice you&apos;re picking between{" "}
          <strong className="font-medium text-foreground">heavy virtual data rooms</strong> (powerful, expensive,
          process-heavy), <strong className="font-medium text-foreground">shared drives</strong> (convenient, easy to
          over-share), <strong className="font-medium text-foreground">email + attachments</strong> (simple, weak
          control), and <strong className="font-medium text-foreground">e-sign tools</strong> (great for signatures,
          not a file room). {SITE_NAME} is deliberately narrow:{" "}
          <strong className="font-medium text-foreground">
            a lightweight room for outsiders at a fair market price
          </strong>
          , with encryption and a trail you can explain to your client or LP in one sentence.
        </p>

        <h2 className="mt-14 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          At a glance
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--tkn-text-support)]">
          “Typical enterprise VDR” here means the category of full-service deal platforms — capabilities vary by vendor.
          “Mixed” means sometimes yes, sometimes only with workarounds or extra products.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--tkn-panel-border)] bg-muted/40">
                <th className="px-3 py-3 font-semibold text-foreground sm:px-4">Capability</th>
                {colLabels.map((c) => (
                  <th
                    key={c.key}
                    className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.capability} className="border-b border-border/80 last:border-b-0">
                  <td className="px-3 py-3 text-[13px] leading-snug text-foreground sm:px-4">{row.capability}</td>
                  <td className="px-2 py-3 align-middle sm:px-3">
                    <CellIcon v={row.token} />
                  </td>
                  <td className="px-2 py-3 align-middle sm:px-3">
                    <CellIcon v={row.enterpriseVdr} />
                  </td>
                  <td className="px-2 py-3 align-middle sm:px-3">
                    <CellIcon v={row.sharedDrive} />
                  </td>
                  <td className="px-2 py-3 align-middle sm:px-3">
                    <CellIcon v={row.zipEmail} />
                  </td>
                  <td className="px-2 py-3 align-middle sm:px-3">
                    <CellIcon v={row.esignOnly} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Why teams pick {SITE_NAME}
        </h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-base leading-relaxed text-[var(--tkn-text-support)]">
          <li>
            <strong className="text-foreground">Fair market price:</strong> published tiers — free, Personal from
            $9.95/mo, Pro from $29.95/mo — instead of hiding the number until you sit through a demo.
          </li>
          <li>
            <strong className="text-foreground">Non-pretentious:</strong> we don&apos;t claim to be your entire
            security or compliance program; we say what we do (encrypt in the browser, revocable links, audit events)
            and what we don&apos;t.
          </li>
          <li>
            <strong className="text-foreground">Lightweight:</strong> create a room, upload, share one link — owner
            controls for files, links, people, and invites stay in one workflow.
          </li>
        </ul>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/login">
              Try a room free
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </article>

      <footer className="border-t border-[color:var(--tkn-panel-border)] py-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← {SITE_NAME} home
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link href="/simple-data-room" className="hover:text-foreground">
          Simple data room
        </Link>
        <span className="mx-2 text-border">·</span>
        <span className="text-xs text-[var(--tkn-text-fine)]">{origin}</span>
      </footer>
    </div>
  );
}
