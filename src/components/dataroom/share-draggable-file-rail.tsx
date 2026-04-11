"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage, FileText } from "lucide-react";

import { formatBytes } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import type { VaultFileEntry } from "@/lib/dataroom/types";
import { cn } from "@/lib/utils";

const railStorageKey = (slug: string) => `tkn_share_rail_pos_${slug}`;

function fileKindIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  return FileText;
}

export function DraggableDecryptedFocusFileRail({
  vaultSlug,
  files,
  activeFileId,
  decryptedFiles,
  onPick,
  /** Docked sidebar on lg+; horizontal strip below lg (tablet / touch laptops). Floating is legacy. */
  layout = "docked",
  /** Full-width horizontal file strip only (full-screen reading mode). */
  readingStrip = false,
}: {
  vaultSlug: string;
  files: VaultFileEntry[];
  activeFileId: string | null;
  decryptedFiles: Record<string, { objectUrl: string; downloadName: string }>;
  onPick: (fileId: string) => void;
  layout?: "docked" | "floating";
  readingStrip?: boolean;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (layout !== "floating") return;
    try {
      const raw = sessionStorage.getItem(railStorageKey(vaultSlug));
      if (raw) {
        const p = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos({ x: p.x, y: p.y });
        }
      }
    } catch {
      /* ignore */
    }
  }, [vaultSlug, layout]);

  const clampToViewport = useCallback((x: number, y: number) => {
    const el = railRef.current;
    const w = el?.offsetWidth ?? 176;
    const h = el?.offsetHeight ?? 300;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    };
  }, []);

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (layout !== "floating" || e.button !== 0) return;
      e.preventDefault();
      const el = railRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragStart.current = {
        px: e.clientX,
        py: e.clientY,
        x: pos?.x ?? rect.left,
        y: pos?.y ?? rect.top,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [layout, pos],
  );

  const onHeaderPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.px;
      const dy = e.clientY - dragStart.current.py;
      const next = clampToViewport(dragStart.current.x + dx, dragStart.current.y + dy);
      setPos(next);
    },
    [clampToViewport],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return;
      dragStart.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      setPos((cur) => {
        if (!cur) return cur;
        try {
          sessionStorage.setItem(railStorageKey(vaultSlug), JSON.stringify(cur));
        } catch {
          /* ignore */
        }
        return cur;
      });
    },
    [vaultSlug],
  );

  const floatingStyle: React.CSSProperties =
    pos != null
      ? { left: pos.x, top: pos.y, transform: "none" }
      : { left: "0.5rem", top: "50%", transform: "translateY(-50%)" };

  if (readingStrip) {
    return (
      <nav
        className="flex w-full shrink-0 flex-col border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/55"
        aria-label="Room files"
      >
        <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-[color:var(--tkn-panel-border)]/70 bg-card/85 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Files
          </p>
          <p className="text-[11px] font-medium tabular-nums text-foreground">{files.length} in room</p>
        </div>
        <ul className="flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 py-2.5 [-webkit-overflow-scrolling:touch] sm:py-2">
          {files.map((f) => {
            const label = decryptedFiles[f.id]?.downloadName ?? f.name;
            const active = f.id === activeFileId;
            const Icon = fileKindIcon(f.mimeType);
            return (
              <li key={f.id} className="snap-start">
                <button
                  type="button"
                  onClick={() => onPick(f.id)}
                  title={label}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-[3.25rem] w-[min(11.5rem,calc(100vw-4rem))] max-w-[13rem] shrink-0 flex-col rounded-xl border px-2.5 py-2 text-left transition-colors sm:min-h-[2.875rem] sm:w-44",
                    active
                      ? "border-[color:var(--color-accent)]/50 bg-[color:var(--color-accent)]/12 shadow-[inset_0_-2px_0_0_var(--color-accent)]"
                      : "border-[color:var(--tkn-panel-border)] bg-card/90 hover:border-foreground/15 hover:bg-card",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        active ? "text-[color:var(--color-accent)]" : "text-muted-foreground",
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {formatMimeLabel(f.mimeType)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  const items = files.map((f) => {
    const label = decryptedFiles[f.id]?.downloadName ?? f.name;
    const active = f.id === activeFileId;
    const Icon = fileKindIcon(f.mimeType);
    return (
      <li key={f.id}>
        <button
          type="button"
          onClick={() => onPick(f.id)}
          title={label}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
            active
              ? "bg-[color:var(--color-accent)]/14 text-foreground shadow-[inset_3px_0_0_0_var(--color-accent)]"
              : "text-muted-foreground hover:bg-muted/90 hover:text-foreground",
          )}
        >
          <Icon
            className={cn(
              "mt-0.5 size-3.5 shrink-0",
              active ? "text-[color:var(--color-accent)]" : "opacity-70",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            {f.category ? (
              <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                {f.category}
              </span>
            ) : null}
            <span
              className={cn(
                "line-clamp-2 font-medium leading-snug",
                layout === "docked" ? "text-[11px]" : "text-xs text-foreground",
              )}
            >
              {label}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
              {formatMimeLabel(f.mimeType)} · {formatBytes(f.sizeBytes)}
            </span>
          </span>
        </button>
      </li>
    );
  });

  if (layout === "docked") {
    return (
      <div className="contents">
        <nav
          className="flex w-full shrink-0 flex-col border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/55 lg:hidden"
          aria-label="Room files"
        >
          <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-[color:var(--tkn-panel-border)]/70 bg-card/85 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Files
            </p>
            <p className="text-[11px] font-medium tabular-nums text-foreground">
              {files.length} in room
            </p>
          </div>
          <ul className="flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 py-2.5 [-webkit-overflow-scrolling:touch] sm:py-2">
            {files.map((f) => {
              const label = decryptedFiles[f.id]?.downloadName ?? f.name;
              const active = f.id === activeFileId;
              const Icon = fileKindIcon(f.mimeType);
              return (
                <li key={f.id} className="snap-start">
                  <button
                    type="button"
                    onClick={() => onPick(f.id)}
                    title={label}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-[3.25rem] w-[min(11.5rem,calc(100vw-4rem))] max-w-[13rem] shrink-0 flex-col rounded-xl border px-2.5 py-2 text-left transition-colors sm:min-h-[2.875rem] sm:w-44",
                      active
                        ? "border-[color:var(--color-accent)]/50 bg-[color:var(--color-accent)]/12 shadow-[inset_0_-2px_0_0_var(--color-accent)]"
                        : "border-[color:var(--tkn-panel-border)] bg-card/90 hover:border-foreground/15 hover:bg-card",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          active ? "text-[color:var(--color-accent)]" : "text-muted-foreground",
                        )}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                          {label}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {formatMimeLabel(f.mimeType)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div
          ref={railRef}
          className="hidden h-full min-h-0 w-[12.75rem] shrink-0 flex-col border-r border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/55 lg:flex"
          role="navigation"
          aria-label="Room files"
        >
          <div className="shrink-0 border-b border-[color:var(--tkn-panel-border)]/80 bg-card/80 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Files
            </p>
            <p className="mt-0.5 text-[11px] font-medium tabular-nums text-foreground">
              {files.length} in room
            </p>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 pb-2">
            {items}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={railRef}
      style={floatingStyle}
      className={cn(
        "pointer-events-auto fixed z-20 max-h-[min(72vh,560px)] w-44 overflow-hidden rounded-xl border border-[color:var(--tkn-panel-border)] bg-card/95 shadow-[0_8px_32px_rgba(35,31,26,0.14)] backdrop-blur-[6px]",
      )}
      role="navigation"
      aria-label="Room files"
    >
      <div
        role="presentation"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="sticky top-0 z-10 cursor-grab touch-none bg-card/95 px-2 py-1.5 active:cursor-grabbing"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </p>
        <p className="text-[9px] leading-tight text-muted-foreground/80">Drag header to move</p>
      </div>
      <ul className="max-h-[min(64vh,480px)] space-y-0.5 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
        {items}
      </ul>
    </div>
  );
}
