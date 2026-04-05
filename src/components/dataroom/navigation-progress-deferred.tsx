"use client";

import dynamic from "next/dynamic";

/** Loads after hydration so the root layout stays free of `ssr: false` in a Server Component. */
const NavigationProgress = dynamic(
  () =>
    import("./navigation-progress").then((m) => m.NavigationProgress),
  { ssr: false },
);

export function NavigationProgressDeferred() {
  return <NavigationProgress />;
}
