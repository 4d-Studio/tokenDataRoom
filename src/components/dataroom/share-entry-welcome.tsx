import type { ReactNode } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export type ShareEntryBranding = {
  /** Host the visitor used (e.g. app.example.com). */
  shareHostLabel: string;
  workspaceLogoUrl?: string | null;
  workspaceCompanyName?: string | null;
  roomTitle: string;
  /** Public room banner (unencrypted); same-origin URL to `/api/vaults/.../share-banner`. */
  shareBannerSrc?: string | null;
  /** Room-level sender (shown before access). */
  senderAttribution?: string | null;
  /** Expiry line preformatted on the server (stable across SSR + hydration). */
  expiresLabel?: string | null;
  /** Optional short note from the owner. */
  roomNote?: string | null;
  /** Strip outer card chrome so this sits inside a parent shell (e.g. below secure link). */
  embedInParent?: boolean;
  /** Hide host label when the full URL is shown nearby (secure link row). */
  suppressHostBadge?: boolean;
};

export const SHARE_RECIPIENT_DISCLAIMER =
  "Access is confidential and may be logged. Only proceed if you are the intended recipient. In-app preview may be watermarked; downloads are unchanged.";

const DEFAULT_DISCLAIMER =
  "Access is confidential and may be logged for security. Only proceed if you are the intended recipient. Preview may show a watermark; downloaded files are unchanged.";

/**
 * Minimal header for `/s/[slug]` — room title + sender context only.
 * (NDA-specific copy belongs in the agreement card, not repeated here.)
 */
export function ShareRecipientCompactHeader({
  shareHostLabel,
  workspaceLogoUrl,
  workspaceCompanyName,
  roomTitle,
  shareBannerSrc,
  senderAttribution,
  expiresLabel,
  roomNote,
  embedInParent = false,
  suppressHostBadge = false,
}: ShareEntryBranding) {
  const host = shareHostLabel.trim() || "Shared link";
  const org = workspaceCompanyName?.trim();
  const banner = shareBannerSrc?.trim();
  const sender = senderAttribution?.trim();
  const note = roomNote?.trim();
  const expiry = expiresLabel?.trim();
  const hasContext = Boolean(sender || expiry || note);
  const showHostBadge = !suppressHostBadge;
  /** Logo mark: larger circle overlap on banner for a clearer “workspace” anchor. */
  const logoOverlap =
    "relative z-[1] flex size-12 shrink-0 items-center justify-center sm:size-[3.75rem]";
  const logoOverlapBanner = `${logoOverlap} -mt-8 rounded-full border-[3px] border-card bg-white p-0.5 shadow-[0_8px_30px_rgba(35,31,26,0.14)] ring-1 ring-[color:var(--tkn-panel-border)]/80 sm:-mt-10 sm:size-16 sm:border-4 sm:p-1`;

  return (
    <header>
      <div
        className={cn(
          "overflow-hidden bg-card",
          embedInParent
            ? "rounded-none border-0 shadow-none ring-0"
            : "rounded-2xl border border-[color:var(--tkn-panel-border)] shadow-[0_2px_28px_rgba(35,31,26,0.06)]",
        )}
      >
        {banner ? (
          <div
            className={cn(
              "relative isolate overflow-hidden",
              embedInParent
                ? "h-[7.25rem] rounded-t-[1.35rem] sm:h-[8.75rem]"
                : "h-[6.5rem] rounded-t-[1.35rem] sm:h-[7.75rem]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner}
              alt=""
              className="absolute inset-0 size-full object-cover scale-[1.01]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/[0.15] via-transparent to-black/[0.35]"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-card from-15% via-card/70 to-transparent"
              aria-hidden
            />
            {showHostBadge ? (
              <p className="absolute bottom-2.5 left-4 right-4 z-[1] font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] sm:bottom-3 sm:left-5 sm:text-[10px]">
                {host}
              </p>
            ) : null}
          </div>
        ) : (
          <div
            className="h-0.5 w-full bg-gradient-to-r from-[var(--color-accent)]/45 via-[var(--color-accent)]/15 to-transparent"
            aria-hidden
          />
        )}

        <div
          className={
            banner
              ? "relative bg-card px-4 pb-5 pt-0 sm:px-7 sm:pb-7"
              : "relative bg-card px-4 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6"
          }
        >
          <div className="flex items-start gap-4 sm:gap-5">
            {workspaceLogoUrl ? (
              <div
                className={
                  banner
                    ? `${logoOverlapBanner} overflow-hidden`
                    : `${logoOverlap} overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-white p-1.5 shadow-[0_2px_12px_rgba(35,31,26,0.08)]`
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={workspaceLogoUrl}
                  alt={workspaceCompanyName ? `${workspaceCompanyName} logo` : "Workspace logo"}
                  className={
                    banner
                      ? "size-full rounded-full object-cover"
                      : "max-h-full max-w-full object-contain"
                  }
                />
              </div>
            ) : banner ? (
              <div
                className={`${logoOverlap} -mt-8 rounded-full border-[3px] border-card bg-gradient-to-br from-muted to-muted/60 shadow-[0_8px_24px_rgba(35,31,26,0.12)] ring-1 ring-[color:var(--tkn-panel-border)] sm:-mt-10`}
              >
                <div className="size-6 rounded-full bg-[var(--color-accent)] sm:size-7" aria-hidden />
              </div>
            ) : (
              <div
                className={`${logoOverlap} rounded-2xl border border-[color:var(--tkn-panel-border)] bg-muted/80 shadow-sm`}
              >
                <div className="size-6 rounded-lg bg-[var(--color-accent)] sm:size-7" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1 pt-1 sm:pt-1.5">
              {!banner && showHostBadge ? (
                <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">
                  {host}
                </p>
              ) : null}
              <h1 className="text-balance text-[1.375rem] font-semibold tracking-[-0.03em] text-foreground leading-[1.15] sm:text-3xl sm:leading-tight">
                {roomTitle}
              </h1>
              {org ? (
                <p className="mt-2 text-sm leading-snug text-[color:var(--tkn-text-support)] sm:text-[0.9375rem]">
                  From <span className="font-medium text-foreground">{org}</span>
                </p>
              ) : null}
            </div>
          </div>

          {hasContext ? (
            <div className="mt-6 space-y-3 sm:mt-7">
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {sender ? (
                  <div className="rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Shared by
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">{sender}</p>
                  </div>
                ) : null}
                {expiry ? (
                  <div className="rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <Clock className="size-3 opacity-80" aria-hidden />
                      Expires
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">{expiry}</p>
                  </div>
                ) : null}
              </div>
              {note ? (
                <p className="text-pretty rounded-xl border border-dashed border-[color:var(--tkn-panel-border)] bg-muted/20 px-4 py-3 text-xs leading-relaxed text-[color:var(--tkn-text-support)] sm:text-[13px]">
                  <span className="font-semibold text-foreground/80">Note · </span>
                  {note}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/** Light-mode hero for desktop share page — sits above blurred decorative layer. */
export function ShareDesktopWelcomeHero({
  shareHostLabel,
  workspaceLogoUrl,
  workspaceCompanyName,
  roomTitle,
  subtitle,
}: ShareEntryBranding & { subtitle?: ReactNode }) {
  const host = shareHostLabel.trim() || "this link";
  const org = workspaceCompanyName?.trim();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur-md sm:p-8">
      <div className="flex flex-col items-center text-center">
        {workspaceLogoUrl ? (
          <div className="mb-4 flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-sm sm:size-[4.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={workspaceLogoUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/50 sm:size-[4.5rem]">
            <div className="size-6 rounded-lg bg-[var(--color-accent)] sm:size-7" />
          </div>
        )}

        <p className="mb-1 max-w-full truncate font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
          {host}
        </p>

        <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          You&apos;re invited to a private data room
        </h2>
        <p className="mt-2 text-balance text-sm font-medium text-foreground sm:text-base">
          {roomTitle}
        </p>
        {org ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Hosted by <span className="font-medium text-foreground">{org}</span>
          </p>
        ) : null}
        {subtitle ? (
          <div className="mt-3 max-w-md text-pretty text-sm text-muted-foreground">{subtitle}</div>
        ) : (
          <p className="mt-3 max-w-md text-pretty text-sm text-muted-foreground">
            Enter your details, read the agreement, then sign to continue. What&apos;s inside stays
            blurred until you&apos;re authorized.
          </p>
        )}

        <p className="mt-5 max-w-lg text-pretty text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          {DEFAULT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

export type ShareMobileWelcomeTone = "theater" | "clean";

/** Full-bleed welcome behind the mobile sheet — theater = dark immersive; clean = light recipient UI. */
export function ShareMobileWelcomeLayer({
  shareHostLabel,
  workspaceLogoUrl,
  workspaceCompanyName,
  roomTitle,
  hasDocument,
  fileName,
  onContinue,
  tone = "clean",
}: ShareEntryBranding & {
  hasDocument: boolean;
  fileName?: string;
  onContinue: () => void;
  tone?: ShareMobileWelcomeTone;
}) {
  const host = shareHostLabel.trim() || "Secure link";
  const org = workspaceCompanyName?.trim();

  if (tone === "clean") {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
          <div className="absolute left-1/2 top-[16%] w-[110%] -translate-x-1/2 opacity-[0.35] blur-2xl">
            <div className="mx-auto space-y-3 px-6">
              <div className="h-3 w-2/3 max-w-xs rounded-md bg-foreground/[0.06]" />
              <div className="h-32 max-w-md rounded-xl border border-border/60 bg-card/80" />
              <div className="h-24 max-w-md rounded-xl border border-border/50 bg-muted/40" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded-md bg-foreground/[0.05]" />
                <div className="h-7 w-16 rounded-md bg-foreground/[0.05]" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-28 pt-8 text-center">
          {workspaceLogoUrl ? (
            <div className="flex size-[4.25rem] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={workspaceLogoUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex size-[4.25rem] items-center justify-center rounded-2xl border border-border bg-muted/70">
              <div className="size-7 rounded-lg bg-[var(--color-accent)]" />
            </div>
          )}

          <p className="max-w-[90vw] truncate font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {host}
          </p>

          <div className="max-w-sm space-y-1.5">
            <h1 className="text-balance text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {roomTitle}
            </h1>
            {org ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{org}</span>
              </p>
            ) : null}
            {hasDocument && fileName ? (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/80">{fileName}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Complete the steps below to view protected content.
              </p>
            )}
          </div>

          <p className="max-w-[min(100%,20rem)] text-pretty text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
            {DEFAULT_DISCLAIMER}
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/92 active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Blurred “everything” — decorative doc stack */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-[#0a0a0a] to-black" />
        <div className="absolute left-1/2 top-[18%] w-[120%] -translate-x-1/2 scale-110 opacity-50 blur-2xl">
          <div className="mx-auto space-y-3 px-6">
            <div className="h-4 w-3/4 max-w-sm rounded-lg bg-white/20" />
            <div className="h-36 max-w-md rounded-xl border border-white/10 bg-white/5" />
            <div className="h-28 max-w-md rounded-xl border border-white/10 bg-white/5" />
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-md bg-white/10" />
              <div className="h-8 w-20 rounded-md bg-white/10" />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-[#0a0a0a]/75 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-28 pt-8 text-center">
        {workspaceLogoUrl ? (
          <div className="flex size-[4.5rem] items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 shadow-lg backdrop-blur-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={workspaceLogoUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex size-[4.5rem] items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md">
            <div className="size-7 rounded-lg bg-[var(--color-accent)]" />
          </div>
        )}

        <p className="max-w-[90vw] truncate font-mono text-[10px] font-medium uppercase tracking-widest text-white/45">
          {host}
        </p>

        <div className="max-w-sm space-y-2">
          <h1 className="text-balance text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Private data room
          </h1>
          <p className="text-balance text-base font-medium text-white/90">{roomTitle}</p>
          {org ? (
            <p className="text-sm text-white/50">
              <span className="text-white/70">{org}</span>
            </p>
          ) : null}
          {hasDocument && fileName ? (
            <p className="text-xs text-white/35">
              Document: <span className="text-white/50">{fileName}</span>
            </p>
          ) : (
            <p className="text-xs text-white/35">Content unlocks after you complete the steps.</p>
          )}
        </div>

        <p className="max-w-[min(100%,20rem)] text-pretty text-[10px] leading-relaxed text-white/40 sm:text-[11px]">
          {DEFAULT_DISCLAIMER}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-900 shadow-xl ring-1 ring-white/20 transition hover:bg-white/95 active:scale-[0.98]"
        >
          Continue to secure access
        </button>
      </div>
    </div>
  );
}
