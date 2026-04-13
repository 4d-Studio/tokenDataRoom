"use client";

import { useDeferredValue } from "react";
import {
  Eye,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { sanitizeHtml } from "@/lib/dataroom/sanitize";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function CreateRoomPreviewSheet({
  fileName,
  documentLater,
  title,
  senderName,
  senderCompany,
  message,
  requiresNda,
  previewNdaBody,
}: {
  fileName: string | null;
  /** When true, copy assumes the file is added after room creation. */
  documentLater?: boolean;
  title: string;
  senderName: string;
  senderCompany: string;
  message: string;
  requiresNda: boolean;
  /** Resolved NDA body (plain text or HTML) as recipients will see it. */
  previewNdaBody: string;
}) {
  const [open, setOpen] = useState(false);

  const previewTitle = title || fileName || "Board Update Q2";
  const effectiveSenderName = senderName.trim() || "Your name";
  const effectiveCompany = senderCompany.trim() || "Your company";
  const deferredNdaText = useDeferredValue(previewNdaBody);

  const previewChips = [
    { icon: Lock, label: "Password required before decryption" },
    {
      icon: ShieldCheck,
      label: requiresNda ? "NDA accepted before access" : "NDA not required",
    },
    { icon: Eye, label: "Sender sees when this room is opened" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-[var(--tkn-text-support)] transition-colors hover:bg-muted/50"
        >
          <Eye className="size-4" />
          Preview recipient view
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l p-0 sm:max-w-none"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">Recipient preview</SheetTitle>
            <button
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--tkn-text-fine)] hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm text-[var(--tkn-text-support)]">
            How the room looks before the recipient unlocks it.
          </p>
        </SheetHeader>

        {/* Recipient view — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="rounded-2xl border border-border bg-white p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {previewTitle}
                </h2>
                <p className="mt-2 text-sm text-[var(--tkn-text-support)]">
                  Shared by {effectiveSenderName}
                  {effectiveCompany ? ` · ${effectiveCompany}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Protected
              </span>
            </div>

            {/* Security chips */}
            <div className="mt-6 flex flex-col gap-2.5">
              {previewChips.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-sm text-[var(--tkn-text-support)]"
                >
                  <Icon className="size-4 shrink-0 text-[var(--color-accent)]" />
                  {label}
                </div>
              ))}
            </div>

            {/* Sender note */}
            {message ? (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="label-title">Note from sender</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--tkn-text-support)]">
                    {message}
                  </p>
                </div>
              </>
            ) : null}

            {/* Recipient steps */}
            <Separator className="my-6" />
            <div>
              <p className="label-title">How it works</p>
              <ol className="mt-4 space-y-3.5 text-sm text-[var(--tkn-text-support)]">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs font-semibold text-[var(--color-accent)]">
                    1
                  </span>
                  Review the title and sender information.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs font-semibold text-[var(--color-accent)]">
                    2
                  </span>
                  {requiresNda
                    ? "Accept the NDA and fill in your details."
                    : "Enter the password shared by the sender."}
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs font-semibold text-[var(--color-accent)]">
                    3
                  </span>
                  {documentLater
                    ? "Once the sender adds a file, the recipient unlocks it with the password."
                    : "Open and download the file."}
                </li>
              </ol>
            </div>

            {/* NDA preview */}
            {requiresNda ? (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="label-title">Confidentiality agreement</p>
                  <div className="tkn-prose mt-3 max-h-40 overflow-hidden text-sm leading-relaxed text-[var(--tkn-text-support)]">
                    {/<[a-z][\s\S]*>/i.test(deferredNdaText) ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(deferredNdaText) }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{deferredNdaText}</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
