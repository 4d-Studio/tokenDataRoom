"use client";

/**
 * View-only deterrent overlay (does not change the downloaded file).
 * Sits above document preview with pointer-events: none so scrolling/interaction pass through.
 */
export function ViewerWatermarkOverlay({
  label,
  variant = "dark",
}: {
  label: string;
  variant?: "dark" | "light";
}) {
  if (!label.trim()) {
    return null;
  }

  const textClass =
    variant === "light"
      ? "text-white/[0.22] font-medium"
      : "text-neutral-950/[0.14] font-semibold";

  const tiles = Array.from({ length: 16 }, (_, i) => i);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[6] select-none overflow-hidden"
      aria-hidden
    >
      <div className="flex h-[140%] w-[140%] -translate-x-[20%] -translate-y-[20%] flex-wrap items-center justify-center gap-x-8 gap-y-14 sm:gap-x-12 sm:gap-y-20">
        {tiles.map((i) => (
          <span
            key={i}
            className={`rotate-[-33deg] whitespace-nowrap text-[0.65rem] sm:text-xs ${textClass}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
