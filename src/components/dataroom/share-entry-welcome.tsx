import type { ReactNode } from "react";

export type ShareEntryBranding = {
  /** Host the visitor used (e.g. app.example.com). */
  shareHostLabel: string;
  workspaceLogoUrl?: string | null;
  workspaceCompanyName?: string | null;
  roomTitle: string;
};

const DEFAULT_DISCLAIMER =
  "Access is confidential and may be logged for security. Only proceed if you are the intended recipient. Preview may show a watermark; downloaded files are unchanged.";

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

/** Dark full-bleed welcome behind the mobile sheet — blurred “room” preview. */
export function ShareMobileWelcomeLayer({
  shareHostLabel,
  workspaceLogoUrl,
  workspaceCompanyName,
  roomTitle,
  hasDocument,
  fileName,
  onContinue,
}: ShareEntryBranding & {
  hasDocument: boolean;
  fileName?: string;
  onContinue: () => void;
}) {
  const host = shareHostLabel.trim() || "Secure link";
  const org = workspaceCompanyName?.trim();

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
