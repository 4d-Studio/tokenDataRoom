"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GripVertical,
  ImageIcon,
  Loader2,
  Lock,
  PencilLine,
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

/** One collapsible folder section in the room file list (custom tag or auto type bucket). */
type FileGroup = {
  label: string;
  icon: typeof FileText;
  files: VaultFileEntry[];
  bucket: "custom" | "auto";
  /** When `bucket === "auto"`, the mime bucket key; otherwise null. */
  autoKey: FileCategory | null;
};

/**
 * Group files by custom category name first; uncategorized files fall
 * back to auto-detection by mime type.
 */
function groupByLabel(files: VaultFileEntry[]): FileGroup[] {
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

  const result: FileGroup[] = [];

  for (const [label, grouped] of customGroups) {
    result.push({
      label,
      icon: FolderOpen,
      files: grouped,
      bucket: "custom",
      autoKey: null,
    });
  }

  const autoOrder: FileCategory[] = ["documents", "images", "spreadsheets", "other"];
  for (const cat of autoOrder) {
    const grouped = autoGroups[cat];
    if (grouped?.length) {
      result.push({
        label: CATEGORY_META[cat].label,
        icon: CATEGORY_META[cat].icon,
        files: grouped,
        bucket: "auto",
        autoKey: cat,
      });
    }
  }

  return result;
}

function fileGroupKey(g: FileGroup): string {
  return g.bucket === "custom" ? `c:${g.label}` : `a:${g.autoKey ?? "x"}`;
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
  onOpenChange,
}: {
  file: VaultFileEntry;
  existingCategories: string[];
  onPick: (fileId: string, category: string) => void;
  /** Lets parent lift stacking context so later file groups (e.g. image tiles) do not paint over the menu. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

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
    <div className={cn("relative", open && "z-[200]")} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.625rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Move to category"
      >
        <Tag className="size-3" />
        {file.category || "Uncategorized"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[210] mt-1 w-48 overflow-hidden rounded-lg border border-border bg-white shadow-xl">
          {existingCategories
            .filter((c) => c !== file.category)
            .map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => apply(c)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[0.6875rem] text-foreground transition-colors hover:bg-muted/40"
              >
                <FolderOpen className="size-3 text-muted-foreground" />
                {c}
              </button>
            ))}
          {file.category && (
            <button
              type="button"
              onClick={() => apply("")}
              className="flex w-full items-center gap-2 border-t border-border px-2.5 py-1.5 text-left text-[0.6875rem] text-muted-foreground transition-colors hover:bg-muted/40"
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

function FileRenameControl({
  file,
  onRename,
}: {
  file: VaultFileEntry;
  onRename: (fileId: string, nextName: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(file.name);
  }, [file.name, editing]);

  const cancel = () => {
    setDraft(file.name);
    setEditing(false);
  };

  const submit = async () => {
    const next = draft.trim();
    if (!next) return;
    if (next === file.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(file.id, next);
      setEditing(false);
    } catch {
      /* error surfaced by parent setError; stay in edit mode */
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            disabled={saving}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-muted/20 px-2 text-xs focus:border-[var(--color-accent)] focus:outline-none sm:min-w-[12rem]"
            autoFocus
            aria-label="New file name"
            aria-busy={saving}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && !saving) void submit();
            }}
          />
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => void submit()}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md bg-foreground px-2.5 text-[0.6875rem] font-semibold text-white disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={cancel}
            className="h-8 shrink-0 rounded-md border border-border px-2.5 text-[0.6875rem] text-muted-foreground hover:bg-muted/50"
          >
            Cancel
          </button>
        </div>
        <p className="text-[0.65rem] leading-snug text-muted-foreground">
          Recipients see this name; downloads use it too (file contents unchanged).
        </p>
      </div>
    );
  }

   return (
    <div className="flex min-w-0 items-center gap-1">
      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground sm:text-[0.8125rem]" title={file.name}>
        {file.name}
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Rename ${file.name}`}
      >
        <PencilLine className="size-3" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function CategoryGroup({
  label,
  icon: Icon,
  files,
  groupMeta,
  groupKey,
  existingCategories,
  onRemove,
  onPreview,
  onCategoryChange,
  onRenameFile,
  orderedFiles,
  reorderEnabled,
  reorderBusy,
  onReorderFile,
  dropTargetKey,
  setDropTargetKey,
  onDropAssign,
  draggingFileId,
  setDraggingFileId,
}: {
  label: string;
  icon: typeof FileText;
  files: VaultFileEntry[];
  groupMeta: FileGroup;
  groupKey: string;
  existingCategories: string[];
  onRemove: (fileId: string) => void;
  onPreview: (file: VaultFileEntry) => void;
  onCategoryChange: (fileId: string, category: string) => void;
  onRenameFile: (fileId: string, name: string) => Promise<void>;
  orderedFiles: VaultFileEntry[];
  reorderEnabled: boolean;
  reorderBusy: boolean;
  onReorderFile: (fileId: string, direction: "up" | "down") => Promise<void>;
  dropTargetKey: string | null;
  setDropTargetKey: (key: string | null) => void;
  onDropAssign: (fileId: string) => void | Promise<void>;
  draggingFileId: string | null;
  setDraggingFileId: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const isDropTarget = dropTargetKey === groupKey && draggingFileId !== null;
  const showDragHint = draggingFileId !== null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-[color:var(--tkn-panel-border)] bg-card shadow-[0_6px_28px_rgba(35,31,26,0.09)] transition-[box-shadow,ring,border-color] duration-150",
        isDropTarget &&
          "border-[var(--color-accent)]/55 shadow-[0_8px_32px_rgba(35,31,26,0.12)] ring-2 ring-[var(--color-accent)]/30 ring-offset-2 ring-offset-background",
        categoryMenuOpen ? "relative z-[150] overflow-visible" : "overflow-hidden",
      )}
      onDragOver={(e) => {
        if (!draggingFileId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTargetKey(groupKey);
        setOpen(true);
      }}
      onDragLeave={(e) => {
        if (
          !e.currentTarget.contains(e.relatedTarget as Node) &&
          dropTargetKey === groupKey
        ) {
          setDropTargetKey(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        setDropTargetKey(null);
        setDraggingFileId(null);
        if (id) void Promise.resolve(onDropAssign(id));
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 border-b border-[color:var(--tkn-panel-border)]/80 bg-gradient-to-b from-[color:var(--color-background-muted)]/95 to-[color:var(--color-background-muted)]/55 px-3 py-2 text-left transition-colors hover:from-muted/90 hover:to-muted/50",
          showDragHint && "cursor-copy",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--tkn-panel-border)] bg-white/95 shadow-sm">
          <Icon className="size-4 text-[var(--color-accent)]" strokeWidth={1.65} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-tight text-foreground">{label}</span>
          {showDragHint ? (
            <span className="mt-0.5 block text-[0.625rem] font-medium text-[var(--color-accent)]">
              Drop here to move into this folder
            </span>
          ) : (
            <span className="mt-0.5 block text-[0.625rem] text-muted-foreground">
              {groupMeta.bucket === "custom" ? "Custom category" : "By file type"}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums text-foreground ring-1 ring-[color:var(--tkn-panel-border)]/60">
          {files.length}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="divide-y divide-border bg-white/40">
          {files.map((f) => {
            const globalIdx = orderedFiles.findIndex((x) => x.id === f.id);
            const canUp = reorderEnabled && globalIdx > 0;
            const canDown = reorderEnabled && globalIdx >= 0 && globalIdx < orderedFiles.length - 1;
            return (
              <div
                key={f.id}
                className={cn(
                  "flex flex-col gap-1.5 px-2 py-2 transition-colors hover:bg-muted/25 sm:flex-row sm:items-center sm:gap-2 sm:px-3",
                  draggingFileId === f.id && "opacity-50",
                )}
              >
                <div
                  className="flex shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-md border border-transparent p-0.5 text-muted-foreground/85 hover:border-border hover:bg-muted/55 active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", f.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingFileId(f.id);
                  }}
                  onDragEnd={() => {
                    setDraggingFileId(null);
                    setDropTargetKey(null);
                  }}
                  title="Drag to another folder"
                  aria-label={`Drag ${f.name} to another folder`}
                >
                  <GripVertical className="size-4" strokeWidth={2} />
                </div>
                {reorderEnabled ? (
                  <div className="flex flex-row items-center gap-0.5 sm:flex-col sm:gap-px sm:py-0.5">
                    <button
                      type="button"
                      disabled={reorderBusy || !canUp}
                      onClick={() => void onReorderFile(f.id, "up")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      aria-label={`Move ${f.name} earlier in the room list`}
                    >
                      <ChevronUp className="size-3.5" strokeWidth={2} />
                    </button>
                    <span className="min-w-[1rem] text-center text-[9px] font-bold tabular-nums text-muted-foreground">
                      {globalIdx >= 0 ? globalIdx + 1 : "—"}
                    </span>
                    <button
                      type="button"
                      disabled={reorderBusy || !canDown}
                      onClick={() => void onReorderFile(f.id, "down")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      aria-label={`Move ${f.name} later in the room list`}
                    >
                      <ChevronDown className="size-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ) : null}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/45">
                  {f.mimeType.startsWith("image/") ? (
                    <ImageIcon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                  ) : f.mimeType === "application/pdf" ? (
                    <FileText className="size-3.5 text-red-400" strokeWidth={1.5} />
                  ) : (
                    <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <FileRenameControl file={f} onRename={onRenameFile} />
                  <div className="mt-0.5 flex flex-col gap-0 text-[0.6875rem] leading-snug text-muted-foreground">
                    <span>
                      {formatBytes(f.sizeBytes)} · {formatMimeLabel(f.mimeType)}
                    </span>
                    {f.addedAt ? (
                      <span className="text-[0.625rem] text-muted-foreground/90">
                        Added {formatDateTime(f.addedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-0.5 sm:justify-start">
                  <CategoryPicker
                    file={f}
                    existingCategories={existingCategories}
                    onPick={onCategoryChange}
                    onOpenChange={setCategoryMenuOpen}
                  />
                  <button
                    type="button"
                    onClick={() => onPreview(f)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Preview ${f.name}`}
                  >
                    <Eye className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
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
  const [reorderBusy, setReorderBusy] = useState(false);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const existingFiles: VaultFileEntry[] = vaultFilesList(metadata);
  const canReorderFiles = Boolean(metadata.vaultFiles && metadata.vaultFiles.length >= 2);
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
              if (res.status === 409 && data.code === "FILE_NAME_CONFLICT") {
                throw new Error(
                  data.error ||
                    "A file with this name already exists and you cannot replace it. Rename your file or ask the room owner to replace it.",
                );
              }
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

  const patchFileCategory = async (fileId: string, category: string) => {
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
  };

  const updateFileCategory = async (fileId: string, category: string) => {
    try {
      await patchFileCategory(fileId, category);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update category.");
    }
  };

  const assignFileToGroupFromDrop = async (fileId: string, group: FileGroup) => {
    const file = existingFiles.find((x) => x.id === fileId);
    if (!file) return;
    setError("");
    try {
      if (group.bucket === "custom") {
        if (file.category === group.label) return;
        await patchFileCategory(fileId, group.label);
        return;
      }
      if (group.autoKey && categorize(file.mimeType) !== group.autoKey) {
        setError(
          `That file doesn’t match “${group.label}”. Use another folder or the tag menu.`,
        );
        return;
      }
      if (
        !file.category &&
        group.autoKey &&
        categorize(file.mimeType) === group.autoKey
      ) {
        return;
      }
      await patchFileCategory(fileId, "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to move file.");
    }
  };

  const renameVaultFile = async (fileId: string, name: string) => {
    try {
      const res = await fetch(`/api/vaults/${slug}/owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerKey,
          action: "rename_vault_file",
          fileId,
          name,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        metadata?: VaultRecord;
        events?: VaultEvent[];
      };
      if (!res.ok || !data.metadata || !data.events) {
        throw new Error(data.error || "Unable to rename file.");
      }
      onUploaded(data.metadata, data.events);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to rename file.";
      setError(msg);
      throw e;
    }
  };

  const reorderVaultFile = async (fileId: string, direction: "up" | "down") => {
    setReorderBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/vaults/${slug}/owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerKey,
          action: "reorder_vault_file",
          fileId,
          direction,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        metadata?: VaultRecord;
        events?: VaultEvent[];
      };
      if (!res.ok || !data.metadata || !data.events) {
        throw new Error(data.error || "Unable to change file order.");
      }
      onUploaded(data.metadata, data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change file order.");
    } finally {
      setReorderBusy(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        isFeatured && "min-h-0 flex-1",
      )}
    >
      {/* ── Section 1: Room files ──────────────────────────────── */}
      {existingFiles.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Room files</h3>
              <p className="mt-0.5 max-w-xl text-[0.6875rem] leading-snug text-muted-foreground">
                {existingFiles.length} file{existingFiles.length !== 1 ? "s" : ""} · encrypted at rest
                {canReorderFiles ? (
                  <>
                    {" "}
                    · #1 is the default recipient preview
                    {reorderBusy ? (
                      <span className="ml-1 inline-flex items-center gap-1 text-[var(--color-accent)]">
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                        Updating order…
                      </span>
                    ) : null}
                  </>
                ) : null}
                <> · Drag the grip to move a file into another folder.</>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {grouped.map((group) => (
              <CategoryGroup
                key={fileGroupKey(group)}
                label={group.label}
                icon={group.icon}
                files={group.files}
                groupMeta={group}
                groupKey={fileGroupKey(group)}
                existingCategories={allCategories}
                onRemove={removeUploaded}
                onPreview={setLightboxFile}
                onCategoryChange={updateFileCategory}
                onRenameFile={renameVaultFile}
                orderedFiles={existingFiles}
                reorderEnabled={canReorderFiles}
                reorderBusy={reorderBusy}
                onReorderFile={reorderVaultFile}
                dropTargetKey={dropTargetKey}
                setDropTargetKey={setDropTargetKey}
                onDropAssign={(fileId) => void assignFileToGroupFromDrop(fileId, group)}
                draggingFileId={draggingFileId}
                setDraggingFileId={setDraggingFileId}
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
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" strokeWidth={2} />
              <p className="text-sm font-semibold text-foreground">End-to-end encrypted uploads</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">1</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">Drop files below</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">2</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">Encrypted in your browser</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                  <span className="text-sm font-bold text-foreground">3</span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">Only the password unlocks them</p>
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
            isFeatured &&
              "min-h-[min(16rem,38dvh)] flex-1 py-10 lg:min-h-[min(20rem,44dvh)] lg:py-14",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="size-7 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium text-foreground">Drop files here</span>
            <span className="text-sm text-muted-foreground"> or click to browse</span>
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
              <p className="text-xs font-medium text-emerald-800">Encryption active</p>
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
                <p className="text-sm font-medium text-amber-900">Enter room password to upload</p>
                <p className="mt-0.5 text-xs text-amber-700/80">
                  Every file is encrypted in your browser using this password before it leaves your device. Share this
                  password separately with recipients so they can decrypt.
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
