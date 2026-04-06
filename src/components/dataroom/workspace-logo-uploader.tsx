"use client";

import { useRef, useState } from "react";
import { ImageIcon, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface WorkspaceLogoUploaderProps {
  logoUrl?: string;
  workspaceName: string;
  companyName: string;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function WorkspaceLogoUploader({
  logoUrl,
  workspaceName,
  companyName,
}: WorkspaceLogoUploaderProps) {
  // savedLogoUrl tracks the confirmed-saved data URL so it persists across prop updates
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPG, WebP, or SVG image.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const saveLogo = async () => {
    if (!preview) return;
    setIsPending(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ logoUrl: preview }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Unable to save logo.");
      }

      // Persist the data URL immediately so it shows without a page reload
      setSavedLogoUrl(preview);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save logo.");
    } finally {
      setIsPending(false);
    }
  };

  const removeLogo = async () => {
    setIsPending(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ logoUrl: "" }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Unable to remove logo.");
      }
      setSavedLogoUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove logo.");
    } finally {
      setIsPending(false);
    }
  };

  const currentLogo = preview ?? savedLogoUrl ?? logoUrl;
  const displayName = workspaceName || companyName || "My Workspace";

  return (
    <div className="space-y-4">
      <div>
        <div className="label-title">Workspace logo</div>
        <p className="tkn-support mt-1">
          Upload a logo shown to recipients in your shared rooms. Max 2 MB — PNG, JPG, WebP, or SVG.
        </p>
      </div>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-white transition-colors",
          currentLogo ? "p-4" : "cursor-pointer p-8 hover:border-[var(--color-accent)]/40",
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !currentLogo && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {currentLogo ? (
          <div className="flex w-full items-center gap-4">
            {/* Logo preview */}
            <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={currentLogo}
                alt={`${displayName} logo`}
                className="size-full object-contain"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-1 flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">{displayName}</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={isPending}
                >
                  <UploadCloud data-icon="inline-start" className="h-4 w-4" />
                  Change logo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeLogo}
                  disabled={isPending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 data-icon="inline-start" className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="size-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-foreground">
                Click to upload or drag and drop
              </span>
              <span className="text-sm text-muted-foreground"> — PNG, JPG, WebP, SVG</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Max 2 MB</div>
          </>
        )}
      </div>

      {/* Pending preview with save */}
      {preview && !preview.startsWith("data:image/svg") && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={saveLogo}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save logo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreview(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
