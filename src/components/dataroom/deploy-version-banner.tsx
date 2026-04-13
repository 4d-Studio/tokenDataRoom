"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POLL_MS = 120_000;

type DeployVersionBannerProps = {
  /** Fallback if the version request fails before baseline is set. */
  initialVersion: string;
};

function shortRelease(v: string): string {
  const t = v.trim() || "dev";
  if (t === "dev" || t.length <= 10) return t;
  return t.slice(0, 10);
}

/**
 * Top-right build id + polling against `/api/version`. When the server reports a newer deploy,
 * prompts the user to refresh so they do not keep stale JS after a release.
 */
export function DeployVersionBanner({ initialVersion }: DeployVersionBannerProps) {
  const baseline = useRef<string | null>(null);
  const [stale, setStale] = useState(false);
  const [runningLabel, setRunningLabel] = useState(() => shortRelease(initialVersion));

  const applyVersion = useCallback((v: string) => {
    const norm = v.trim() || "dev";
    if (baseline.current === null) {
      baseline.current = norm;
      setRunningLabel(shortRelease(norm));
      return;
    }
    if (norm !== baseline.current) {
      setStale(true);
      return;
    }
    setRunningLabel(shortRelease(norm));
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      const v = (data.version ?? "").trim() || initialVersion.trim() || "dev";
      applyVersion(v);
    } catch {
      /* ignore */
    }
  }, [applyVersion, initialVersion]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { version?: string };
        const v = (data.version ?? "").trim() || initialVersion.trim() || "dev";
        applyVersion(v);
      } catch {
        if (!cancelled) {
          applyVersion(initialVersion.trim() || "dev");
        }
      }
    })();

    const id = window.setInterval(() => {
      void check();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => {
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [applyVersion, initialVersion, check]);

  return (
    <div
      className="pointer-events-none fixed right-2 top-2 z-[200] flex max-w-[min(100vw-1rem,20rem)] flex-col items-end gap-2 sm:right-3 sm:top-3"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto rounded-md border border-border/80 bg-card/90 px-2 py-1 font-mono text-[0.65rem] leading-none text-muted-foreground shadow-sm backdrop-blur-sm",
          stale && "ring-2 ring-amber-500/55",
        )}
        title="App build id (updates when you refresh after a deploy)"
      >
        {runningLabel}
      </div>
      {stale ? (
        <div
          role="status"
          className="pointer-events-auto rounded-lg border border-amber-500/35 bg-card/95 px-3 py-2.5 text-left shadow-md backdrop-blur-sm"
        >
          <p className="text-xs font-medium text-foreground">A new version is available</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Refresh to load the latest fixes. You are on build{" "}
            <span className="font-mono text-foreground">{shortRelease(baseline.current ?? "")}</span>.
          </p>
          <Button type="button" size="sm" className="mt-2 w-full" onClick={() => window.location.reload()}>
            Refresh now
          </Button>
        </div>
      ) : null}
    </div>
  );
}
