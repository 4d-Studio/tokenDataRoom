"use client";

import { useState } from "react";
import { Check, ClipboardCopy, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/dataroom/types";

export type RecipientManifestFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  addedAt?: string;
  category?: string;
};

export function buildRecipientAccessSummaryText(opts: {
  roomTitle: string;
  senderLine: string;
  shareUrl: string;
  expiresLabel: string;
  files: RecipientManifestFile[];
  acceptance: VaultAcceptanceRecord | null;
  exportedAtIso: string;
}): string {
  const lines: string[] = [];
  lines.push("TOKEN ROOM — ACCESS SUMMARY (for your records)");
  lines.push("");
  lines.push(`Room: ${opts.roomTitle}`);
  lines.push(`Shared by: ${opts.senderLine}`);
  lines.push(`Share link: ${opts.shareUrl}`);
  lines.push(`Access expiry (as shown): ${opts.expiresLabel}`);
  lines.push(`Summary generated: ${formatDateTime(opts.exportedAtIso)}`);
  lines.push("");
  if (opts.acceptance) {
    lines.push("Recipient identity (as provided):");
    lines.push(`  Name: ${opts.acceptance.signerName}`);
    lines.push(`  Email: ${opts.acceptance.signerEmail}`);
    if (opts.acceptance.signerCompany) {
      lines.push(`  Company: ${opts.acceptance.signerCompany}`);
    }
    if (opts.acceptance.signerAddress?.trim()) {
      lines.push(`  Address: ${opts.acceptance.signerAddress.trim()}`);
    }
    lines.push(`  NDA accepted: ${formatDateTime(opts.acceptance.acceptedAt)}`);
    lines.push("");
  }
  lines.push(`Files listed (${opts.files.length}) at generation time:`);
  opts.files.forEach((f, i) => {
    const added = f.addedAt ? formatDateTime(f.addedAt) : "date unknown";
    lines.push(
      `  ${i + 1}. ${f.name} — ${formatMimeLabel(f.mimeType)}, ${formatBytes(f.sizeBytes)} — added ${added}`,
    );
  });
  lines.push("");
  lines.push(
    "Note: The sender may add, remove, or replace files, or revoke this link. Save downloads your team, audit, or counsel need while access is active.",
  );
  lines.push("");
  lines.push("— Token · token.fyi");
  return lines.join("\n");
}

export function RecipientRecordPanel({
  metadata,
  recipientShareUrl,
  shareExpiresLabel,
  files,
  acceptance,
}: {
  metadata: Pick<VaultRecord, "title" | "senderName" | "senderCompany">;
  recipientShareUrl: string;
  shareExpiresLabel: string;
  files: RecipientManifestFile[];
  acceptance: VaultAcceptanceRecord | null;
}) {
  const [copied, setCopied] = useState(false);
  const senderLine =
    metadata.senderName +
    (metadata.senderCompany?.trim() ? ` · ${metadata.senderCompany.trim()}` : "");

  const handleCopy = async () => {
    const text = buildRecipientAccessSummaryText({
      roomTitle: metadata.title,
      senderLine,
      shareUrl: recipientShareUrl,
      expiresLabel: shareExpiresLabel,
      files,
      acceptance,
      exportedAtIso: new Date().toISOString(),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard API unavailable or denied */
    }
  };

  if (files.length === 0) return null;

  return (
    <details className="group rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/35 open:bg-[color:var(--color-background-muted)]/45">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--tkn-panel-border)] bg-card text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <FileText className="size-4" strokeWidth={1.65} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              For your records
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              Access summary · copy for audit or your team
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-[color:var(--tkn-text-support)] group-open:hidden">
          Open
        </span>
        <span className="hidden shrink-0 text-[11px] font-medium text-[color:var(--tkn-text-support)] group-open:inline">
          Close
        </span>
      </summary>
      <div className="space-y-4 border-t border-[color:var(--tkn-panel-border)] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <p className="text-xs leading-relaxed text-[color:var(--tkn-text-support)]">
          Plain-text snapshot of this room, file names, sizes, and when each file was added. Paste into email, notes,
          or a ticket. Not a substitute for downloading files you must retain — save those separately.
        </p>
        <ul className="max-h-40 space-y-2 overflow-y-auto overscroll-contain text-xs text-[color:var(--tkn-text-support)] sm:max-h-52">
          {files.map((f) => (
            <li key={f.id} className="border-b border-[color:var(--tkn-panel-border)]/50 pb-2 last:border-b-0">
              <span className="font-medium text-foreground">{f.name}</span>
              <span className="mt-0.5 block text-[11px]">
                {formatMimeLabel(f.mimeType)} · {formatBytes(f.sizeBytes)}
                {f.addedAt ? (
                  <> · Added {formatDateTime(f.addedAt)}</>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-[color:var(--tkn-panel-border)] bg-card"
            onClick={(e) => {
              e.preventDefault();
              void handleCopy();
            }}
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <ClipboardCopy className="size-4" />}
            {copied ? "Copied" : "Copy full summary"}
          </Button>
        </div>
      </div>
    </details>
  );
}
