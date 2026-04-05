import type { ReactNode } from "react";

/**
 * Lightweight route enter treatment (CSS only — no framer-motion on the critical path).
 * Remounts on each client navigation so the animation can run per route.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="tkn-page-enter w-full">{children}</div>;
}
