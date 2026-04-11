"use client";

import { Link2, Lock } from "lucide-react";

import { PoweredByToken } from "@/components/dataroom/brand-mark";
import { CopyButton } from "@/components/dataroom/copy-button";
import { cn } from "@/lib/utils";

const panelBorder = "border-[color:var(--tkn-panel-border)]";

/**
 * Slim top bar — reference: editorial product nav; colors stay on Token tokens (cream, ink, emerald trust, primary CTA elsewhere).
 */
export function ShareRecipientAppBar({
  accessGranted,
  recipientShareUrl,
}: {
  accessGranted: boolean;
  recipientShareUrl: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 pb-4",
        panelBorder,
        "border-b",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <PoweredByToken className="shrink-0 text-left sm:pt-0.5" />
        {accessGranted ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-right">
            Shared room
          </p>
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-2 rounded-xl sm:max-w-[min(100%,32rem)] sm:flex-row sm:items-center sm:gap-0 sm:rounded-lg sm:border sm:bg-card sm:px-1 sm:py-1 sm:shadow-[0_1px_3px_rgba(35,31,26,0.05)]",
              panelBorder,
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:pl-3 sm:pr-1 sm:py-1">
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-800/18 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 shadow-[inset_0_0_0_1px_rgba(5,46,22,0.04)]">
                <Lock className="size-2.5 text-emerald-800/70" aria-hidden />
                Encrypted
              </span>
              <div className="hidden h-4 w-px shrink-0 bg-[color:var(--tkn-panel-border)] sm:block" aria-hidden />
              <div className="flex min-h-7 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <Link2 className="size-3 shrink-0 text-muted-foreground/75" aria-hidden />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[10px] leading-none text-foreground sm:text-[11px]"
                  title={recipientShareUrl}
                >
                  {recipientShareUrl}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "flex justify-end border-t pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-1",
                panelBorder,
              )}
            >
              <CopyButton
                value={recipientShareUrl}
                size="icon"
                variant="outline"
                ariaLabel="Copy room link"
                title="Copy link"
                className="h-10 w-10 min-h-10 min-w-10 border-[color:var(--tkn-panel-border)] bg-white sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
              />
            </div>
          </div>
        )}
      </div>
      {!accessGranted ? (
        <p className="mt-2.5 text-[10px] leading-snug text-[color:var(--tkn-text-fine)] sm:mt-2 sm:text-right">
          Confirm this link matches what you were sent before you continue.
        </p>
      ) : null}
    </header>
  );
}
