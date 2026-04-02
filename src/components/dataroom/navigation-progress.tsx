"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

function routeKeyFrom(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const q = searchParams?.toString();
  return q ? `${pathname}?${q}` : pathname;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = routeKeyFrom(pathname, searchParams);

  const [phase, setPhase] = useState<"idle" | "loading" | "finish">("idle");
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const prevRouteKey = useRef(routeKey);
  const skipFirstRouteEffect = useRef(true);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (skipFirstRouteEffect.current) {
      skipFirstRouteEffect.current = false;
      prevRouteKey.current = routeKey;
      return;
    }
    if (routeKey === prevRouteKey.current) return;
    prevRouteKey.current = routeKey;

    let idleAfterFinish: ReturnType<typeof setTimeout> | undefined;

    if (phaseRef.current === "loading") {
      const startFinish = window.setTimeout(() => {
        setPhase("finish");
        idleAfterFinish = window.setTimeout(() => setPhase("idle"), 380);
      }, 0);
      return () => {
        window.clearTimeout(startFinish);
        if (idleAfterFinish) window.clearTimeout(idleAfterFinish);
      };
    }

    const reset = window.setTimeout(() => setPhase("idle"), 0);
    return () => window.clearTimeout(reset);
  }, [routeKey]);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = window.setTimeout(() => setPhase("idle"), 12_000);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      const anchor = t.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      const hrefAttr = anchor.getAttribute("href");
      if (
        !hrefAttr ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:") ||
        hrefAttr.toLowerCase().startsWith("javascript:") ||
        hrefAttr.toLowerCase().startsWith("data:")
      ) {
        return;
      }
      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (anchor.hasAttribute("download")) return;
      const dest = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (dest === current) return;
      setPhase("loading");
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, []);

  if (phase === "idle") {
    return null;
  }

  if (reducedMotion) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100000] h-0.5 bg-[var(--color-accent)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100000] h-0.5 overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      {phase === "loading" ? (
        <div className="tkn-nav-progress-indeterminate" />
      ) : (
        <div className="tkn-nav-progress-complete" />
      )}
    </div>
  );
}

/**
 * Top-of-viewport progress during in-app navigations (same-origin `<a href>` clicks).
 * Wrapped in `Suspense` because `useSearchParams()` needs a boundary at the root.
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
