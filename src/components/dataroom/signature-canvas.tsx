"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pen, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignatureCanvasProps {
  value: string; // typed signature text
  imageValue?: string; // drawn signature base64 PNG
  onChange: (text: string) => void;
  onImageChange: (image: string | undefined) => void;
  placeholder?: string;
}

export function SignatureCanvas({
  value,
  imageValue,
  onChange,
  onImageChange,
  placeholder = "Jane Doe",
}: SignatureCanvasProps) {
  const [mode, setMode] = useState<"draw" | "type">("type");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);

  // Init canvas on mount or mode switch to draw
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Set internal resolution to match display size
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      // Restore existing drawing if any
      if (imageValue) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = imageValue;
      }
    };

    resize();
    // Re-draw on window resize
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mode, imageValue]);

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    hasDrawn.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    const pos = getPos(e);
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [getPos]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [getPos]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn.current) return;
    const dataUrl = canvas.toDataURL("image/png");
    onImageChange(dataUrl);
  }, [onImageChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawn.current = false;
    onImageChange(undefined);
  }, [onImageChange]);

  const previewText = value
    ? value
        .split("")
        .map((c) =>
          c === " "
            ? " "
            : "v"[Math.floor(Math.random() * 4)] // simulates cursive
        )
        .join("")
    : "";

  return (
    <div className="flex flex-col gap-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "type"
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--odr-text-support)] hover:bg-muted"
          }`}
        >
          <Type className="size-3.5" />
          Type
        </button>
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            mode === "draw"
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--odr-text-support)] hover:bg-muted"
          }`}
        >
          <Pen className="size-3.5" />
          Draw
        </button>
      </div>

      {/* Type mode */}
      {mode === "type" && (
        <div className="flex flex-col gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="text-lg font-semibold tracking-tight"
          />
          {value && (
            <p className="border-b border-[var(--color-ink)] pb-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {previewText}
            </p>
          )}
          <p className="text-xs text-[var(--odr-text-fine)]">
            Your typed name will appear as your signature
          </p>
        </div>
      )}

      {/* Draw mode */}
      {mode === "draw" && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="relative z-10 w-full cursor-crosshair rounded-lg border border-[var(--color-ink)] bg-white"
              style={{ height: 96 }}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            {/* Placeholder */}
            {!hasDrawn.current && !imageValue && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[var(--odr-text-fine)]">Draw your signature here</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              className="gap-1.5"
            >
              <Eraser className="size-3.5" />
              Clear
            </Button>
            {imageValue && (
              <p className="text-xs text-[var(--odr-text-fine)]">
                Signature captured
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
