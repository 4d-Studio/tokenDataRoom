"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatBytes } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import type { VaultFileEntry } from "@/lib/dataroom/types";
import { cn } from "@/lib/utils";

const railStorageKey = (slug: string) => `tkn_share_rail_pos_${slug}`;

export function DraggableDecryptedFocusFileRail({
  vaultSlug,
  files,
  activeFileId,
  decryptedFiles,
  onPick,
}: {
  vaultSlug: string;
  files: VaultFileEntry[];
  activeFileId: string | null;
  decryptedFiles: Record<string, { objectUrl: string; downloadName: string }>;
  onPick: (fileId: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
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
  }, [vaultSlug]);

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
      if (e.button !== 0) return;
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
    [pos],
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

  const style: React.CSSProperties =
    pos != null
      ? { left: pos.x, top: pos.y, transform: "none" }
      : { left: "0.5rem", top: "50%", transform: "translateY(-50%)" };

  return (
    <div
      ref={railRef}
      style={style}
      className={cn(
        "pointer-events-auto fixed z-20 max-h-[min(72vh,560px)] w-44 overflow-hidden rounded-xl border border-[color:var(--tkn-panel-border)] bg-card/95 shadow-[0_8px_32px_rgba(35,31,26,0.14)] backdrop-blur-[6px]",
        pos == null ? "" : "",
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
        {files.map((f) => {
          const label = decryptedFiles[f.id]?.downloadName ?? f.name;
          const active = f.id === activeFileId;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPick(f.id)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                  active
                    ? "bg-[color:var(--color-accent)]/12 font-medium text-foreground ring-1 ring-[color:var(--color-accent)]/35"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {f.category ? (
                  <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                    {f.category}
                  </span>
                ) : null}
                <span className="line-clamp-2 text-xs leading-snug text-foreground">{label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {formatMimeLabel(f.mimeType)} · {formatBytes(f.sizeBytes)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
