"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, X } from "lucide-react";

import { PoweredByToken } from "@/components/dataroom/brand-mark";
import { CopyButton } from "@/components/dataroom/copy-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const panelBorder = "border-[color:var(--tkn-panel-border)]";

export interface ShareRecipientAppBarProps {
  accessGranted: boolean;
  recipientShareUrl: string;
  /** Free-tier share pages show Token attribution; Personal/Pro hide it. */
  showPoweredByToken?: boolean;
}

/**
 * Top bar with one obvious Share action. Opens a full-screen sheet: big copy, big close — easy to exit.
 */
export function ShareRecipientAppBar({
  accessGranted,
  recipientShareUrl,
  showPoweredByToken = true,
}: ShareRecipientAppBarProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-[color:var(--color-background)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-link-sheet-title"
          >
            <div
              className={cn(
                "flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5",
                panelBorder,
              )}
            >
              <h2
                id="share-link-sheet-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Share this room
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={close}
              >
                <X className="size-4" aria-hidden />
                Close
              </Button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-8">
              <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
                <p className="text-sm text-muted-foreground">
                  Copy the link and send it the same way you got it. Recipients still need the{" "}
                  <span className="font-medium text-foreground">room password</span> to open files.
                </p>
                <div
                  className={cn(
                    "rounded-xl border bg-card p-4 shadow-sm",
                    panelBorder,
                  )}
                >
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Link
                  </p>
                  <p className="break-all font-mono text-xs leading-relaxed text-foreground sm:text-sm">
                    {recipientShareUrl}
                  </p>
                </div>
                <CopyButton
                  value={recipientShareUrl}
                  label="Copy link"
                  variant="default"
                  size="sm"
                  className="h-12 w-full text-base font-semibold shadow-sm bg-[var(--color-accent)] text-white hover:opacity-95 hover:text-white"
                  ariaLabel="Copy room link"
                  title="Copy link to clipboard"
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header
        className={cn(
          "mb-6 pb-4",
          panelBorder,
          "border-b",
        )}
      >
        {!showPoweredByToken ? (
          <span className="sr-only">Shared securely via Token</span>
        ) : null}
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
            showPoweredByToken ? "sm:justify-between" : "sm:justify-end",
          )}
        >
          {showPoweredByToken ? (
            <PoweredByToken className="shrink-0 text-left sm:pt-0.5" />
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            {accessGranted ? (
              <span className="text-xs text-muted-foreground sm:mr-2">You have access</span>
            ) : null}
            <Button
              type="button"
              size="default"
              className="h-11 min-w-[10rem] gap-2 bg-[var(--color-accent)] px-5 text-base font-semibold text-white shadow-sm hover:opacity-95 hover:text-white"
              onClick={() => setOpen(true)}
            >
              <Share2 className="size-4 shrink-0 opacity-95" aria-hidden />
              Share link
            </Button>
          </div>
        </div>
        {!accessGranted ? (
          <p className="mt-3 text-xs leading-snug text-[color:var(--tkn-text-fine)] sm:text-right">
            Tap <span className="font-medium text-foreground">Share link</span> to copy the address, or confirm it
            matches what you were sent.
          </p>
        ) : null}
      </header>
      {modal}
    </>
  );
}
