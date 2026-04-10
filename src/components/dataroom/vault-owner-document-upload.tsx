"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  Lock,
  ShieldCheck,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { decryptFile, encryptFile } from "@/lib/dataroom/client-crypto";
import { ownerVaultPasswordSessionKey } from "@/lib/dataroom/owner-vault-session";
import { FILE_SIZE_LIMIT_BYTES, vaultFilesList } from "@/lib/dataroom/types";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
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

const PW_KEY = ownerVaultPasswordSessionKey;

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

/**
 * Group files by custom category name first; uncategorized files fall
 * back to auto-detection by mime type.
 */
function groupByLabel(files: VaultFileEntry[]): { label: string; icon: typeof FileText; files: VaultFileEntry[] }[] {
  const customGroups = new Map<string, VaultFileEntry[]>();
  const autoGroups: Partial<Record<FileCategory, VaultFileEntry[]>> = {};

  for (const f of files) {
    if (f.category) {
      const list = customGroups.get(f.category) ?? [];
      list.push(f);
      customGroups.set(f.category, list);
    } else {
      const cat = categorize(f.mimeType);
      (autoGroups[cat] ??= []).push(f);
    }
  }

  const result: { label: string; icon: typeof FileText; files: VaultFileEntry[] }[] = [];

  for (const [label, grouped] of customGroups) {
    result.push({ label, icon: FolderOpen, files: grouped });
  }

  const autoOrder: FileCategory[] = ["documents", "images", "spreadsheets", "other"];
  for (const cat of autoOrder) {
    const grouped = autoGroups[cat];
    if (grouped?.length) {
      result.push({ label: CATEGORY_META[cat].label, icon: CATEGORY_META[cat].icon, files: grouped });
    }
  }

  return result;
}

/** Collect all unique custom category names from existing files. */
function collectCategories(files: VaultFileEntry[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    if (f.category) set.add(f.category);
  }
  return Array.from(set).sort();
}

// ── Lightbox ──────────────────────────────────────────────────────────

function FileLightbox({
  file,
  slug,
  onClose,
}: {
  file: VaultFileEntry;
  slug: string;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const isPreviewable =
    file.mimeType.startsWith("image/") ||
    file.mimeType === "application/pdf" ||
    file.mimeType.startsWith("text/");

  useEffect(() => {
    if (!isPreviewable) return;
    const pw = sessionStorage.getItem(PW_KEY(slug));
    if (!pw) return;

    let cancelled = false;
    setLoading(true);
    setPreviewError("");

    (async () => {
      try {
        const res = await fetch(`/api/vaults/${slug}/bundle?fileId=${file.id}`);
        if (!res.ok) throw new Error("Unable to fetch file.");
        const encryptedBytes = await res.arrayBuffer();
        const decrypted = await decryptFile({
          encryptedBytes,
          password: pw,
          salt: file.salt,
          iv: file.iv,
          pbkdf2Iterations: file.pbkdf2Iterations,
        });
        if (cancelled) return;
        const blob = new Blob([decrypted], { type: file.mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
      } catch {
        if (!cancelled) setPreviewError("Enter the room password below to preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, slug, isPreviewable]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
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
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Decrypting…</span>
            </div>
          ) : previewUrl ? (
            file.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={file.name}
                className="mx-auto max-h-[75vh] w-auto object-contain p-4"
              />
            ) : file.mimeType === "application/pdf" ? (
              <iframe
                title={file.name}
                src={previewUrl}
                className="h-[75vh] w-full"
              />
            ) : (
              <iframe
                title={file.name}
                src={previewUrl}
                className="h-[60vh] w-full"
              />
            )
          ) : (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 p-6 text-center">
              <FileText className="size-10 text-muted-foreground/30" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">
                {previewError || (isPreviewable
                  ? "Enter the room password to preview this file."
                  : "This file type cannot be previewed. Download it from the recipient share page.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category accordion ────────────────────────────────────────────────

function CategoryPicker({
  file,
  existingCategories,
  onPick,
}: {
  file: VaultFileEntry;
  existingCategories: string[];
  onPick: (fileId: string, category: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const apply = (cat: string) => {
    onPick(file.id, cat);
    setOpen(false);
    setCustom("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Move to category"
      >
        <Tag className="size-3" />
        {file.category || "Uncategorized"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {existingCategories
            .filter((c) => c !== file.category)
            .map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => apply(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/40"
              >
                <FolderOpen className="size-3 text-muted-foreground" />
                {c}
              </button>
            ))}
          {file.category && (
            <button
              type="button"
              onClick={() => apply("")}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <X className="size-3" />
              Remove category
            </button>
          )}
          <div className="border-t border-border p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) apply(custom.trim());
              }}
              className="flex gap-1"
            >
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="New category…"
                maxLength={60}
                className="h-7 min-w-0 flex-1 rounded border border-border bg-muted/20 px-2 text-xs placeholder:text-muted-foreground focus:border-[var(--color-accent)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!custom.trim()}
                className="rounded bg-foreground px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  label,
  icon: Icon,
  files,
  existingCategories,
  onRemove,
  onPreview,
  onCategoryChange,
}: {
  label: string;
  icon: typeof FileText;
  files: VaultFileEntry[];
  existingCategories: string[];
  onRemove: (fileId: string) => void;
  onPreview: (file: VaultFileEntry) => void;
  onCategoryChange: (fileId: string, category: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isImage = files.every((f) => f.mimeType.startsWith("image/"));

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_16px_rgba(35,31,26,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-background-muted)]/40"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {label}
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
        <div className="border-t border-[color:var(--tkn-panel-border)]">
          {isImage ? (
            <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="group relative overflow-hidden rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/40"
                >
                  <div className="flex aspect-square items-center justify-center">
                    <ImageIcon
                      className="size-8 text-muted-foreground/40"
                      strokeWidth={1}
                    />
                  </div>
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
                  <div className="border-t border-[color:var(--tkn-panel-border)] bg-card px-2 py-1.5">
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
            <div className="divide-y divide-[color:var(--tkn-panel-border)]">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[color:var(--color-background-muted)]/35"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    {f.mimeType === "application/pdf" ? (
                      <FileText
                        className="size-4 text-[color:var(--color-accent)]"
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
                    <div className="text-xs text-muted-foreground">
                      <span>
                        {formatBytes(f.sizeBytes)} · {formatMimeLabel(f.mimeType)}
                      </span>
                      {f.addedAt ? (
                        <span className="mt-0.5 block text-[0.65rem] text-[color:var(--tkn-text-support)]">
                          Added {formatDateTime(f.addedAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <CategoryPicker
                    file={f}
                    existingCategories={existingCategories}
                    onPick={onCategoryChange}
                  />
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
  const grouped = groupByLabel(existingFiles);
  const allCategories = collectCategories(existingFiles);

  const hasActive = pending.some(
    (p) => p.status === "encrypting" || p.status === "uploading",
  );
  const hasPending = pending.some(
    (p) => p.status === "pending" || p.status === "error",
  );
  const doneCount = pending.filter((p) => p.status === "done").length;
  const errorCount = pending.filter((p) => p.status === "error").length;
  const canAutoStart = password.length >= 8;

  // Keep sessionStorage in sync so invite emails use the same password (no separate invite field).
  useEffect(() => {
    try {
      if (password.length >= 8) {
        sessionStorage.setItem(PW_KEY(slug), password);
      } else if (password.length === 0) {
        sessionStorage.removeItem(PW_KEY(slug));
      }
    } catch {
      /* quota / private mode */
    }
  }, [password, slug]);

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

  const updateFileCategory = async (fileId: string, category: string) => {
    try {
      const res = await fetch(`/api/vaults/${slug}/owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerKey,
          action: "update_file_category",
          fileId,
          category,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        metadata?: VaultRecord;
        events?: VaultEvent[];
      };
      if (!res.ok || !data.metadata || !data.events) {
        throw new Error(data.error || "Unable to update category.");
      }
      onUploaded(data.metadata, data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update category.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1: Room files ──────────────────────────────── */}
      {existingFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Room files
              </p>
              <p className="text-sm font-medium text-foreground">
                {existingFiles.length} encrypted file
                {existingFiles.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs leading-snug text-[color:var(--tkn-text-support)]">
                Stored encrypted — only your room password decrypts them for preview or download.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {grouped.map((group) => (
              <CategoryGroup
                key={group.label}
                label={group.label}
                icon={group.icon}
                files={group.files}
                existingCategories={allCategories}
                onRemove={removeUploaded}
                onPreview={setLightboxFile}
                onCategoryChange={updateFileCategory}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 2: Add files ───────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Separator when there are existing files */}
        {existingFiles.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--tkn-panel-border)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Add more files
            </span>
            <div className="h-px flex-1 bg-[color:var(--tkn-panel-border)]" />
          </div>
        )}

        {/* How it works — shown when no files uploaded yet */}
        {existingFiles.length === 0 && pending.length === 0 && (
          <div className="rounded-2xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-card text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:text-emerald-400/95">
                <ShieldCheck className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    How it works
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    End-to-end encrypted uploads
                  </p>
                </div>
                <ol className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
                  {[
                    { n: "1", line: "Drop files in the zone below" },
                    { n: "2", line: "Encrypted in your browser before upload" },
                    { n: "3", line: "Only your room password unlocks them" },
                  ].map((step) => (
                    <li
                      key={step.n}
                      className="flex gap-2.5 rounded-xl border border-[color:var(--tkn-panel-border)]/80 bg-card/90 px-3 py-2.5 text-left shadow-[0_1px_6px_rgba(35,31,26,0.04)]"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-background-muted)]/80 text-xs font-semibold tabular-nums text-foreground">
                        {step.n}
                      </span>
                      <span className="text-[11px] leading-snug text-[color:var(--tkn-text-support)]">{step.line}</span>
                    </li>
                  ))}
                </ol>
                <p className="border-t border-dashed border-[color:var(--tkn-panel-border)] pt-3 text-center text-[11px] leading-relaxed text-[color:var(--tkn-text-support)]">
                  We never see plaintext files. Share the room password with recipients separately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload queue */}
        {pending.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_16px_rgba(35,31,26,0.04)]">
            <div className="flex items-center justify-between border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/45 px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                {pending.length} file{pending.length !== 1 ? "s" : ""} queued
                {hasActive ? " · encrypting & uploading…" : ""}
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
            <div className="divide-y divide-[color:var(--tkn-panel-border)]">
              {pending.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 bg-card px-4 py-2.5",
                    entry.status === "error" && "bg-red-50/50",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50">
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

        {/* Drop zone — with encryption context */}
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
            "upload-zone flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[color:var(--tkn-panel-border)] bg-card py-9 text-center transition-[border-color,background-color,box-shadow]",
            "hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent)]/[0.04] hover:shadow-[0_2px_20px_rgba(243,91,45,0.08)]",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex size-11 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <UploadCloud className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">
              Drop files here
            </span>
            <span className="text-sm text-[color:var(--tkn-text-support)]">
              {" "}or click to browse
            </span>
          </div>
          <p className="text-xs text-[color:var(--tkn-text-support)]">
            PDF, Word, Excel, images, text · max {(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB each
          </p>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Encryption password */}
        {canAutoStart ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/45 px-4 py-3 shadow-[0_2px_16px_rgba(16,185,129,0.06)] sm:flex-row sm:items-center sm:gap-3 sm:py-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/90 bg-white/80 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
              <ShieldCheck className="size-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100/95">
                Encryption active
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/85 dark:text-emerald-200/75">
                Files encrypt in your browser before upload. The server never sees plaintext.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPassword("");
                sessionStorage.removeItem(PW_KEY(slug));
              }}
              className="shrink-0 rounded-xl border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
            >
              Change password
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/85 bg-amber-50/50 p-4 shadow-[0_2px_16px_rgba(245,158,11,0.07)]">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-white/75 text-amber-800 dark:bg-amber-950/25 dark:text-amber-200">
                <Lock className="size-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100/95">
                  Enter room password to upload
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/75">
                  Every file is encrypted in your browser with this password before it leaves your device. Share it
                  separately with recipients so they can decrypt.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={passwordRef}
                  id="owner-upload-pw"
                  type={showPassword ? "text" : "password"}
                  autoComplete="off"
                  placeholder="Same password you set when creating this room"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hasPending && !hasActive) {
                      e.preventDefault();
                      retryAll();
                    }
                  }}
                  className="h-10 w-full rounded-xl border-2 border-amber-200/90 bg-white px-3 pr-14 text-sm placeholder:text-muted-foreground shadow-[0_1px_6px_rgba(35,31,26,0.04)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/20 dark:bg-card"
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
                  size="sm"
                  onClick={retryAll}
                  disabled={password.length < 8 || hasActive}
                  aria-busy={hasActive}
                  className="shrink-0"
                >
                  {hasActive ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  {hasActive ? "Encrypting…" : errorCount > 0 ? `Retry ${errorCount}` : `Upload ${pending.length}`}
                </Button>
              )}
            </div>
          </div>
        )}

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
          slug={slug}
          onClose={() => setLightboxFile(null)}
        />
      )}
    </div>
  );
}
