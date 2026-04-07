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
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
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
        <div className="border-t border-border">
          {isImage ? (
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatBytes(f.sizeBytes)} ·{" "}
                        {formatMimeLabel(f.mimeType)}
                      </span>
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
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Add more files
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* How it works — shown when no files uploaded yet */}
        {existingFiles.length === 0 && pending.length === 0 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="size-4 text-emerald-600" strokeWidth={2} />
              <p className="text-sm font-semibold text-foreground">
                End-to-end encrypted uploads
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">1</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  Drop files below
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">2</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  Encrypted in your browser
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">3</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  Only the password unlocks them
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              We never see your files. Share the room password separately with recipients.
            </p>
          </div>
        )}

        {/* Upload queue */}
        {pending.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
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
              {" "}or click to browse
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
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
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-2.5">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-emerald-800">
                Encryption active
              </p>
              <p className="text-[0.7rem] text-emerald-600/80">
                Files encrypt in your browser before upload. The server never sees plaintext.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPassword("");
                sessionStorage.removeItem(PW_KEY(slug));
              }}
              className="rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-700 transition hover:bg-emerald-50"
            >
              Change password
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-start gap-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Enter room password to upload
                </p>
                <p className="mt-0.5 text-xs text-amber-700/80">
                  Every file is encrypted in your browser using this password before it leaves your device. Share this password separately with recipients so they can decrypt.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
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
                  className="h-9 w-full rounded-lg border border-amber-200 bg-white px-3 pr-14 text-sm placeholder:text-muted-foreground focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
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
