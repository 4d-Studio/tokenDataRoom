"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hand, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SharePreviewViewport({
  children,
  edgeNavLeft,
  edgeNavRight,
  /** When false, children fill the container with no pan/zoom chrome (e.g. native PDF in iframe). */
  canvasMode = true,
  /** Stretch to parent flex height instead of a fixed viewport height. */
  fillHeight = false,
}: {
  children: React.ReactNode;
  edgeNavLeft?: ReactNode;
  edgeNavRight?: ReactNode;
  canvasMode?: boolean;
  fillHeight?: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [zoomHint, setZoomHint] = useState("Wheel pans · Cmd/Ctrl + scroll zooms");
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [handTool, setHandTool] = useState(false);
  const panDrag = useRef<{
    active: boolean;
    startPan: { x: number; y: number };
    startClient: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
    setZoomHint(
      mac
        ? "Wheel pans · Cmd + scroll zooms · Hand: drag the page"
        : "Wheel pans · Ctrl + scroll zooms · Hand: drag the page",
    );
  }, []);

  const handleWheelCapture = useCallback(
    (e: React.WheelEvent) => {
      if (!canvasMode) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setScale((s) => Math.min(2.75, Math.max(0.55, Math.round((s + delta) * 100) / 100)));
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    },
    [canvasMode],
  );

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!handTool || e.button !== 0) return;
      panDrag.current = {
        active: true,
        startPan: { ...pan },
        startClient: { x: e.clientX, y: e.clientY },
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [handTool, pan],
  );

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panDrag.current?.active) return;
    const d = panDrag.current;
    setPan({
      x: d.startPan.x + (e.clientX - d.startClient.x),
      y: d.startPan.y + (e.clientY - d.startClient.y),
    });
  }, []);

  const onCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    if (!panDrag.current?.active) return;
    panDrag.current.active = false;
    panDrag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* released */
    }
  }, []);

  if (!canvasMode) {
    return (
      <div
        className={cn(
          "relative min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-[color:var(--color-background-muted)]/30",
          fillHeight ? "flex flex-1 flex-col" : "min-h-[min(88vh,1200px)]",
        )}
      >
        {edgeNavLeft || edgeNavRight ? (
          <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-between gap-2 px-1 sm:px-3">
            <div className="pointer-events-auto flex shrink-0 items-center">{edgeNavLeft}</div>
            <div className="pointer-events-auto flex shrink-0 items-center">{edgeNavRight}</div>
          </div>
        ) : null}
        <div className={cn("relative h-full min-h-0 w-full", fillHeight && "flex min-h-0 flex-1 flex-col")}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-2", fillHeight && "min-h-0 flex-1")}
    >
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Canvas
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-[color:var(--tkn-panel-border)] bg-card px-1 py-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Zoom out"
            onClick={() => setScale((s) => Math.max(0.55, Math.round((s - 0.1) * 100) / 100))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Zoom in"
            onClick={() => setScale((s) => Math.min(2.75, Math.round((s + 0.1) * 100) / 100))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Reset pan and zoom"
            onClick={resetView}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant={handTool ? "secondary" : "outline"}
          className="h-8 gap-1 text-xs"
          onClick={() => setHandTool((v) => !v)}
          aria-pressed={handTool}
        >
          <Hand className="size-3.5" />
          Hand
        </Button>
        <span className="text-[10px] text-muted-foreground">{zoomHint}</span>
      </div>

      <div
        ref={outerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-[color:var(--tkn-panel-border)]/60 bg-[color:var(--color-background-muted)]/55 shadow-[inset_0_0_0_1px_rgba(35,31,26,0.04)]",
          "bg-[radial-gradient(circle_at_1px_1px,rgba(35,31,26,0.07)_1px,transparent_0)] [background-size:20px_20px]",
          fillHeight
            ? "min-h-0 flex-1"
            : "h-[min(85vh,920px)] min-h-[380px]",
        )}
        onWheelCapture={handleWheelCapture}
      >
        {edgeNavLeft || edgeNavRight ? (
          <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-between gap-2 px-1 sm:px-3">
            <div className="pointer-events-auto flex shrink-0 items-center">{edgeNavLeft}</div>
            <div className="pointer-events-auto flex shrink-0 items-center">{edgeNavRight}</div>
          </div>
        ) : null}

        <div
          role="application"
          aria-label="Preview canvas — pan and zoom"
          className={cn(
            "absolute inset-0 flex items-center justify-center select-none",
            handTool ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        >
          <div
            className="relative flex max-h-full max-w-full items-center justify-center will-change-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            {children}
            {handTool ? (
              <div
                className="absolute inset-0 z-[12] bg-transparent"
                aria-hidden title="Drag to pan"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
