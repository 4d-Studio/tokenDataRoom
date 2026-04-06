"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { encryptFile } from "@/lib/dataroom/client-crypto";
import { FILE_SIZE_LIMIT_BYTES, vaultFilesList } from "@/lib/dataroom/types";
import { formatBytes } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import type { VaultEvent, VaultFileEntry, VaultRecord } from "@/lib/dataroom/types";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  ownerKey: string;
  metadata: VaultRecord;
  onUploaded: (metadata: VaultRecord, events: VaultEvent[]) => void;
  onFileRemoved?: (metadata: VaultRecord, events: VaultEvent[]) => void;
  variant?: "default" | "featured" | "compact";
};

type PendingEntry = {
  id: string;
  file: File;
  status: "pending" | "encrypting" | "uploading" | "done" | "error";
  error?: string;
};

const PW_KEY = (slug: string) => `tkn_vault_pw_${slug}`;

export function VaultOwnerDocumentUpload({
  slug,
  ownerKey,
  metadata,
  onUploaded,
  onFileRemoved,
  variant = "default",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PW_KEY(slug)) ?? "" : "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [, startRemoveTransition] = useTransition();

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const existingFiles: VaultFileEntry[] = vaultFilesList(metadata);

  const hasActive = pending.some((p) => p.status === "encrypting" || p.status === "uploading");
  const hasPending = pending.some((p) => p.status === "pending" || p.status === "error");
  const doneCount = pending.filter((p) => p.status === "done").length;
  const errorCount = pending.filter((p) => p.status === "error").length;

  // If password is already saved, auto-start when files land
  const canAutoStart = password.length >= 8;

  // ── Add files to queue ────────────────────────────────────────────────

  const addFiles = useCallback(
    (rawFiles: FileList | null) => {
      setError("");
      if (!rawFiles?.length) return;
      const valid: File[] = [];
      for (const f of Array.from(rawFiles)) {
        if (f.size > FILE_SIZE_LIMIT_BYTES) {
          setError(`${f.name} exceeds ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB limit.`);
          return;
        }
        valid.push(f);
      }
      const newEntries: PendingEntry[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      }));
      setPending((prev) => {
        const existing = new Set(prev.map((p) => p.file.name));
        return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name))];
      });
      // Focus password if not set
      if (password.length < 8) {
        setTimeout(() => passwordRef.current?.focus(), 50);
      }
    },
    [password.length],
  );

  // ── Start encrypting + uploading the queue ────────────────────────────

  const startUploads = useCallback(
    (pw: string) => {
      if (!pw || pw.length < 8) return;
      sessionStorage.setItem(PW_KEY(slug), pw);
      const toUpload = pending.filter((p) => p.status === "pending" || p.status === "error");
      if (!toUpload.length) return;
      setNeedsSignIn(false);

      startTransition(async () => {
        for (const entry of toUpload) {
          setPending((prev) =>
            prev.map((p) => (p.id === entry.id ? { ...p, status: "encrypting" as const } : p)),
          );

          try {
            const result = await encryptFile(entry.file, pw);
            setPending((prev) =>
              prev.map((p) => (p.id === entry.id ? { ...p, status: "uploading" as const } : p)),
            );

            const formData = new FormData();
            formData.append(
              "encryptedFile",
              new File([result.encryptedBytes], `${entry.file.name}.filmia`, {
                type: "application/octet-stream",
              }),
            );
            formData.append(
              "metadata",
              JSON.stringify({
                ownerKey,
                fileName: entry.file.name,
                mimeType: entry.file.type || "application/octet-stream",
                fileSize: entry.file.size,
                salt: result.salt,
                iv: result.iv,
                pbkdf2Iterations: result.pbkdf2Iterations,
              }),
            );

            const res = await fetch(`/api/vaults/${slug}/payload`, {
              method: "POST",
              body: formData,
            });

            const data = (await res.json()) as {
              error?: string;
              code?: string;
              metadata?: VaultRecord;
              events?: VaultEvent[];
            };

            if (res.status === 401 && data.code === "LOGIN_REQUIRED") {
              setNeedsSignIn(true);
              setPending((prev) =>
                prev.map((p) =>
                  p.id === entry.id ? { ...p, status: "error" as const, error: "Sign in required." } : p,
                ),
              );
              throw new Error("SIGN_IN_REQUIRED");
            }

            if (!res.ok || !data.metadata || !data.events) {
              throw new Error(data.error || "Upload failed.");
            }

            setPending((prev) =>
              prev.map((p) => (p.id === entry.id ? { ...p, status: "done" as const } : p)),
            );
            onUploaded(data.metadata, data.events);

            // Remove done entry after 2s
            setTimeout(() => {
              setPending((prev) => prev.filter((p) => p.id !== entry.id));
            }, 2000);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Upload failed.";
            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id ? { ...p, status: "error" as const, error: msg } : p,
              ),
            );
            if (msg.startsWith("SIGN_IN_REQUIRED")) setNeedsSignIn(true);
          }
        }
      });
    },
    [pending, ownerKey, slug],
  );

  // When password is filled and there are pending files, auto-start
  useEffect(() => {
    if (canAutoStart && hasPending && !hasActive) {
      startUploads(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoStart, hasPending]);

  // ── Remove / cancel ──────────────────────────────────────────────────

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const removeUploaded = (fileId: string) => {
    startRemoveTransition(async () => {
      try {
        const res = await fetch(
          `/api/vaults/${slug}/payload?fileId=${fileId}&ownerKey=${ownerKey}`,
          { method: "DELETE" },
        );
        if (res.status === 401) {
          setNeedsSignIn(true);
          return;
        }
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || "Could not remove file.");
        }
        const data = (await res.json()) as { metadata?: VaultRecord; events?: VaultEvent[] };
        if (data.metadata && data.events && onFileRemoved) {
          onFileRemoved(data.metadata, data.events);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not remove file.");
      }
    });
  };

  const retryAll = () => {
    if (!password || password.length < 8) {
      passwordRef.current?.focus();
      return;
    }
    startUploads(password);
  };

  // ── Render ─────────────────────────────────────────────────────────

  const headerTitle = isFeatured ? "Add documents" : isCompact ? "Files" : "Upload files";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      {(existingFiles.length > 0 || pending.length > 0) && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn("font-semibold text-foreground", isCompact && "text-sm")}>
              {headerTitle}
            </h3>
            {!isCompact && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {existingFiles.length > 0
                  ? `${existingFiles.length} uploaded · ${pending.filter((p) => p.status === "done").length} new`
                  : pending.length > 0
                    ? `${pending.length} waiting to upload`
                    : "No files yet"}
                {pending.some((p) => p.status === "encrypting" || p.status === "uploading")
                  ? " · uploading…"
                  : ""}
              </p>
            )}
          </div>
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
              {errorCount} failed
            </span>
          )}
          {doneCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              {doneCount} uploaded
            </span>
          )}
        </div>
      )}

      {/* File list */}
      {pending.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {pending.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 bg-white px-4 py-3",
                entry.status === "error" && "bg-red-50/50",
              )}
            >
              {/* Icon */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                {entry.status === "encrypting" || entry.status === "uploading" ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : entry.status === "done" ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : entry.status === "error" ? (
                  <X className="size-4 text-red-500" />
                ) : (
                  <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
                )}
              </div>

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{entry.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(entry.file.size)} ·{" "}
                  {formatMimeLabel(entry.file.type || "application/octet-stream")}
                  {entry.status === "encrypting" && " · Encrypting…"}
                  {entry.status === "uploading" && " · Uploading…"}
                  {entry.status === "done" && " · Done"}
                  {entry.status === "error" && ` · ${entry.error}`}
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => removePending(entry.id)}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Remove"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Already-uploaded files */}
      {existingFiles.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {existingFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-white px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.sizeBytes)} · {formatMimeLabel(f.mimeType)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeUploaded(f.id)}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Delete ${f.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Password field */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <input
            ref={passwordRef}
            id="owner-upload-pw"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            placeholder="Room password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasPending && !hasActive) {
                e.preventDefault();
                retryAll();
              }
            }}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 pr-16 text-sm placeholder:text-muted-foreground focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {hasPending && (
          <Button
            type="button"
            onClick={retryAll}
            disabled={password.length < 8 || hasActive}
            aria-busy={hasActive}
            className="shrink-0"
          >
            {hasActive ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Encrypting…
              </>
            ) : errorCount > 0 ? (
              <>
                <UploadCloud className="size-4" />
                Retry {errorCount}
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Upload {pending.length}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-white py-8 text-center transition-colors",
          "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud className="size-7 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium text-foreground">
            Drop files here
          </span>
          <span className="text-sm text-muted-foreground"> or click to browse</span>
        </div>
        <p className="text-xs text-muted-foreground">PDF, Word, Excel, images, text</p>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {needsSignIn && (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/login">Sign in to upload</Link>
        </Button>
      )}
    </div>
  );
}
