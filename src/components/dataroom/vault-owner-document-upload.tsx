"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

// ── File type categorization ──────────────────────────────────────────

type FileCategory = "documents" | "images" | "spreadsheets" | "other";

function categorize(mimeType: string): FileCategory {
  if (mimeType.startsWith("image/")) return "images";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("presentationml") ||
    mimeType === "text/plain"
  )
    return "documents";
  if (mimeType.includes("spreadsheetml") || mimeType === "text/csv")
    return "spreadsheets";
  return "other";
}

const CATEGORY_META: Record<
  FileCategory,
  { label: string; icon: typeof FileText }
> = {
  documents: { label: "Documents", icon: FileText },
  images: { label: "Images", icon: ImageIcon },
  spreadsheets: { label: "Spreadsheets", icon: FileSpreadsheet },
  other: { label: "Other files", icon: FileText },
};

function groupByCategory(files: VaultFileEntry[]) {
  const groups: Partial<Record<FileCategory, VaultFileEntry[]>> = {};
  for (const f of files) {
    const cat = categorize(f.mimeType);
    (groups[cat] ??= []).push(f);
  }
  return groups;
}

// ── Lightbox ──────────────────────────────────────────────────────────

function FileLightbox({
  file,
  onClose,
}: {
  file: VaultFileEntry;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.sizeBytes)} · {formatMimeLabel(file.mimeType)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close preview"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex min-h-[40vh] items-center justify-center bg-muted/20 p-6">
          {file.mimeType.startsWith("image/") ? (
            <p className="text-center text-sm text-muted-foreground">
              Image preview is available on the recipient share page after decryption.
              <br />
              Files are stored encrypted — no server-side preview is possible.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Preview is available on the recipient share page after decryption.
              <br />
              Files are stored encrypted — no server-side preview is possible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category accordion ────────────────────────────────────────────────

function CategoryGroup({
  category,
  files,
  onRemove,
  onPreview,
}: {
  category: FileCategory;
  files: VaultFileEntry[];
  onRemove: (fileId: string) => void;
  onPreview: (file: VaultFileEntry) => void;
}) {
  const [open, setOpen] = useState(true);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const isImage = category === "images";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          {isImage ? (
            /* Image grid with thumbnails */
            <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex aspect-square items-center justify-center">
                    <ImageIcon
                      className="size-8 text-muted-foreground/40"
                      strokeWidth={1}
                    />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onPreview(f)}
                      className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-white"
                    >
                      <Eye className="mr-1 inline-block size-3" />
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(f.id)}
                      className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-500"
                    >
                      <Trash2 className="mr-1 inline-block size-3" />
                      Delete
                    </button>
                  </div>
                  {/* Label */}
                  <div className="border-t border-border bg-white px-2 py-1.5">
                    <p className="truncate text-xs font-medium text-foreground">
                      {f.name}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      {formatBytes(f.sizeBytes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Document list */
            <div className="divide-y divide-border">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                    {f.mimeType === "application/pdf" ? (
                      <FileText
                        className="size-4 text-red-400"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Icon
                        className="size-4 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {f.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(f.sizeBytes)} ·{" "}
                      {formatMimeLabel(f.mimeType)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreview(f)}
                    className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Preview ${f.name}`}
                  >
                    <Eye className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

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
    typeof window !== "undefined"
      ? sessionStorage.getItem(PW_KEY(slug)) ?? ""
      : "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [, startRemoveTransition] = useTransition();
  const [lightboxFile, setLightboxFile] = useState<VaultFileEntry | null>(null);

  const isCompact = variant === "compact";
  const existingFiles: VaultFileEntry[] = vaultFilesList(metadata);
  const grouped = groupByCategory(existingFiles);

  const hasActive = pending.some(
    (p) => p.status === "encrypting" || p.status === "uploading",
  );
  const hasPending = pending.some(
    (p) => p.status === "pending" || p.status === "error",
  );
  const doneCount = pending.filter((p) => p.status === "done").length;
  const errorCount = pending.filter((p) => p.status === "error").length;
  const canAutoStart = password.length >= 8;

  // ── Add files to queue ────────────────────────────────────────────

  const addFiles = useCallback(
    (rawFiles: FileList | null) => {
      setError("");
      if (!rawFiles?.length) return;
      const valid: File[] = [];
      const sizeErrors: string[] = [];
      for (const f of Array.from(rawFiles)) {
        if (f.size > FILE_SIZE_LIMIT_BYTES) {
          sizeErrors.push(f.name);
        } else {
          valid.push(f);
        }
      }
      if (sizeErrors.length > 0) {
        setError(
          sizeErrors.length === 1
            ? `${sizeErrors[0]} exceeds ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB limit.`
            : `${sizeErrors.length} files exceed the ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
        );
      }
      if (valid.length === 0) return;

      const newEntries: PendingEntry[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      }));

      const existingNames = new Set([
        ...pending.map((p) => p.file.name),
        ...existingFiles.map((f) => f.name),
      ]);

      setPending((prev) => [
        ...prev,
        ...newEntries.filter((e) => !existingNames.has(e.file.name)),
      ]);

      if (password.length < 8) {
        setTimeout(() => passwordRef.current?.focus(), 50);
      }
    },
    [password.length, existingFiles, pending],
  );

  // ── Start encrypting + uploading the queue ──────────────────────

  const startUploads = useCallback(
    (pw: string) => {
      if (!pw || pw.length < 8) return;
      sessionStorage.setItem(PW_KEY(slug), pw);
      const toUpload = pending.filter(
        (p) => p.status === "pending" || p.status === "error",
      );
      if (!toUpload.length) return;
      setNeedsSignIn(false);

      startTransition(async () => {
        for (const entry of toUpload) {
          setPending((prev) =>
            prev.map((p) =>
              p.id === entry.id
                ? { ...p, status: "encrypting" as const }
                : p,
            ),
          );

          try {
            const result = await encryptFile(entry.file, pw);
            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id
                  ? { ...p, status: "uploading" as const }
                  : p,
              ),
            );

            const formData = new FormData();
            formData.append(
              "encryptedFile",
              new File(
                [result.encryptedBytes],
                `${entry.file.name}.filmia`,
                { type: "application/octet-stream" },
              ),
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
                  p.id === entry.id
                    ? {
                        ...p,
                        status: "error" as const,
                        error: "Sign in required.",
                      }
                    : p,
                ),
              );
              throw new Error("SIGN_IN_REQUIRED");
            }

            if (!res.ok || !data.metadata || !data.events) {
              throw new Error(data.error || "Upload failed.");
            }

            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id ? { ...p, status: "done" as const } : p,
              ),
            );
            onUploaded(data.metadata, data.events);

            setTimeout(() => {
              setPending((prev) => prev.filter((p) => p.id !== entry.id));
            }, 2000);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Upload failed.";
            setPending((prev) =>
              prev.map((p) =>
                p.id === entry.id
                  ? { ...p, status: "error" as const, error: msg }
                  : p,
              ),
            );
            if (msg.startsWith("SIGN_IN_REQUIRED")) setNeedsSignIn(true);
          }
        }
      });
    },
    [pending, ownerKey, slug, onUploaded, startTransition],
  );

  useEffect(() => {
    if (canAutoStart && hasPending && !hasActive) {
      startUploads(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoStart, hasPending]);

  // ── Remove / cancel ────────────────────────────────────────────

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
        const data = (await res.json()) as {
          metadata?: VaultRecord;
          events?: VaultEvent[];
        };
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

  // ── Render ─────────────────────────────────────────────────────

  const categoryOrder: FileCategory[] = [
    "documents",
    "images",
    "spreadsheets",
    "other",
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1: Room files ──────────────────────────────── */}
      {existingFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Room files
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {existingFiles.length} file
                {existingFiles.length !== 1 ? "s" : ""} uploaded · encrypted at
                rest
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {categoryOrder.map((cat) => {
              const files = grouped[cat];
              if (!files?.length) return null;
              return (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  files={files}
                  onRemove={removeUploaded}
                  onPreview={setLightboxFile}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 2: Add files ───────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Separator when there are existing files */}
        {existingFiles.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Add more files
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Upload queue */}
        {pending.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {pending.length} file{pending.length !== 1 ? "s" : ""} queued
                {hasActive ? " · uploading…" : ""}
              </p>
              <div className="flex items-center gap-2">
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    {doneCount} done
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    {errorCount} failed
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-border">
              {pending.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 bg-white px-4 py-2.5",
                    entry.status === "error" && "bg-red-50/50",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                    {entry.status === "encrypting" ||
                    entry.status === "uploading" ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : entry.status === "done" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : entry.status === "error" ? (
                      <X className="size-3.5 text-red-500" />
                    ) : (
                      <FileText
                        className="size-3.5 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(entry.file.size)}
                      {entry.status === "encrypting" && " · Encrypting…"}
                      {entry.status === "uploading" && " · Uploading…"}
                      {entry.status === "done" && " · Done"}
                      {entry.status === "error" && ` · ${entry.error}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePending(entry.id)}
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
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
            <span className="text-sm text-muted-foreground">
              {" "}
              or click to browse
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, Word, Excel, images, text
          </p>
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

      {/* Lightbox */}
      {lightboxFile && (
        <FileLightbox
          file={lightboxFile}
          onClose={() => setLightboxFile(null)}
        />
      )}
    </div>
  );
}
