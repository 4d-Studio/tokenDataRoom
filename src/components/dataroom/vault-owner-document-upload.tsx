"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
  id: string; // temp client-side id
  file: File;
  status: "pending" | "encrypting" | "uploading" | "done" | "error";
  error?: string;
};

const PW_STORAGE_KEY = (slug: string) => `tkn_vault_pw_${slug}`;

export function VaultOwnerDocumentUpload({
  slug,
  ownerKey,
  metadata,
  onUploaded,
  onFileRemoved,
  variant = "default",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [password, setPassword] = useState(() => {
    // Pre-fill from session storage so owner doesn't retype
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(PW_STORAGE_KEY(slug)) ?? "";
    }
    return "";
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [, startRemoveTransition] = useTransition();

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const existingFiles: VaultFileEntry[] = vaultFilesList(metadata);

  const handleFileValidation = useCallback((rawFiles: FileList | null): File[] => {
    if (!rawFiles?.length) return [];
    const valid: File[] = [];
    for (const f of Array.from(rawFiles)) {
      if (f.size > FILE_SIZE_LIMIT_BYTES) {
        setError(`${f.name} is too large (max ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB).`);
        return [];
      }
    }
    return valid;
  }, []);

  const addFiles = useCallback(
    (rawFiles: FileList | null) => {
      setError("");
      if (!rawFiles?.length) return;

      const newEntries: PendingEntry[] = Array.from(rawFiles).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      }));

      setPending((prev) => {
        const existingNames = new Set(prev.filter((p) => p.status !== "error").map((p) => p.file.name));
        const deduped = newEntries.filter((e) => !existingNames.has(e.file.name));
        return [...prev, ...deduped];
      });
    },
    [],
  );

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const removeUploaded = (fileId: string) => {
    startRemoveTransition(async () => {
      try {
        const res = await fetch(`/api/vaults/${slug}/payload?fileId=${fileId}&ownerKey=${ownerKey}`, {
          method: "DELETE",
        });
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

  const uploadAll = () => {
    if (!password || password.length < 8) {
      setError("Enter the room password (min. 8 characters) to encrypt and upload.");
      return;
    }
    if (!pending.length) return;
    setError("");
    setNeedsSignIn(false);

    // Persist password for the session so owner doesn't retype for each file
    sessionStorage.setItem(PW_STORAGE_KEY(slug), password);

    startTransition(async () => {
      for (const entry of pending) {
        if (entry.status === "done" || entry.status === "encrypting" || entry.status === "uploading") {
          continue;
        }

        // Mark encrypting
        setPending((prev) =>
          prev.map((p) => (p.id === entry.id ? { ...p, status: "encrypting" as const } : p)),
        );

        try {
          const result = await encryptFile(entry.file, password);

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

          // Remove completed entries after a short delay
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
          if (msg.startsWith("SIGN_IN_REQUIRED")) {
            setNeedsSignIn(true);
          }
        }
      }
    });
  };

  const allDone = pending.every((p) => p.status === "done" || p.status === "pending" === false);
  const hasActive =
    pending.some((p) => p.status === "encrypting" || p.status === "uploading");
  const canUpload =
    pending.some((p) => p.status === "pending" || p.status === "error") &&
    !hasActive &&
    Boolean(password && password.length >= 8);

  // ── Compact / Featured: uploaded file list + inline drop ───────────────

  if (isCompact || isFeatured) {
    const pad = isCompact ? "p-3.5" : "p-5";
    const iconBox = isCompact ? "size-11" : "size-14";
    const iconSz = isCompact ? "size-6" : "size-7";

    return (
      <div className={cn("flex flex-col gap-3", isFeatured && "gap-2.5")}>
        {/* Uploaded files list */}
        {existingFiles.map((f) => (
          <div
            key={f.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border bg-card shadow-sm",
              pad,
            )}
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50",
                iconBox,
              )}
            >
              <FileText className={iconSz} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(f.sizeBytes)} · {formatMimeLabel(f.mimeType)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeUploaded(f.id)}
              className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label={`Remove ${f.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        {/* Pending files */}
        {pending.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border bg-card shadow-sm",
              pad,
              entry.status === "error" && "border-destructive/50",
            )}
          >
            <div className={cn("flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50", iconBox)}>
              {entry.status === "encrypting" || entry.status === "uploading" ? (
                <Loader2 className={cn(iconSz, "animate-spin text-muted-foreground")} />
              ) : entry.status === "done" ? (
                <UploadCloud className={cn(iconSz, "text-emerald-500")} />
              ) : (
                <FileText className={iconSz} strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{entry.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(entry.file.size)} · {formatMimeLabel(entry.file.type || "application/octet-stream")}
                {entry.status === "encrypting" && " · Encrypting…"}
                {entry.status === "uploading" && " · Uploading…"}
                {entry.status === "done" && " · Done"}
                {entry.status === "error" && ` · ${entry.error}`}
              </p>
            </div>
            {(entry.status === "pending" || entry.status === "error") && (
              <button
                type="button"
                onClick={() => removePending(entry.id)}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${entry.file.name}`}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}

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
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors",
            isFeatured ? "min-h-[5rem]" : "min-h-[5rem]",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="size-5 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium text-foreground">
              {pending.length || existingFiles.length ? "Add more files" : "Upload files"}
            </span>
            <span className="text-sm text-muted-foreground"> — PDF, Office, images, text</span>
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  // ── Default: full-page layout ────────────────────────────────────────

  const dropMinH = "min-h-[9rem]";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Add encrypted files</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Use your room password to encrypt each file in your browser, then upload.
        </p>
      </div>

      {/* Password */}
      <Field>
        <FieldLabel htmlFor="owner-upload-pw">
          Room password <span className="font-normal text-muted-foreground">(saved for this session)</span>
        </FieldLabel>
        <div className="relative">
          <Input
            id="owner-upload-pw"
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            placeholder="Same password you set when creating the room"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

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
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className={
          "upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors " +
          dropMinH +
          " " +
          "border-border bg-muted/30 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
        }
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium text-foreground">
            {pending.length ? "Add more files" : "Drop files or click to browse"}
          </span>
          <span className="text-sm text-muted-foreground"> — PDF, Office, images, text · max 25 MB</span>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Pending queue */}
      {pending.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border bg-white p-3",
            entry.status === "error" && "border-destructive/50",
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            {entry.status === "encrypting" ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : entry.status === "uploading" ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : entry.status === "done" ? (
              <UploadCloud className="size-4 text-emerald-500" />
            ) : (
              <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{entry.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(entry.file.size)} · {formatMimeLabel(entry.file.type || "application/octet-stream")}
              {entry.status === "encrypting" && " · Encrypting…"}
              {entry.status === "uploading" && " · Uploading…"}
              {entry.status === "done" && " · Done!"}
              {entry.status === "error" && ` · ${entry.error}`}
            </p>
          </div>
          {(entry.status === "pending" || entry.status === "error") && (
            <button
              type="button"
              onClick={() => removePending(entry.id)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Remove"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ))}

      {/* Already-uploaded files */}
      {existingFiles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Uploaded ({existingFiles.length})
          </p>
          {existingFiles.map((f) => (
            <div
              key={f.id}
              className="mb-1.5 flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => removeUploaded(f.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${f.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {needsSignIn ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/login">Sign in to upload</Link>
        </Button>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={uploadAll}
          disabled={!canUpload || isPending}
          aria-busy={hasActive}
        >
          {hasActive ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Encrypting & uploading…
            </>
          ) : (
            <>
              <UploadCloud className="size-4" />
              Upload {pending.filter((p) => p.status === "pending" || p.status === "error").length} file
              {pending.filter((p) => p.status === "pending" || p.status === "error").length !== 1
                ? "s"
                : ""}
            </>
          )}
        </Button>
        {pending.some((p) => p.status === "done") && (
          <p className="text-xs text-emerald-600">
            {pending.filter((p) => p.status === "done").length} file(s) uploaded
          </p>
        )}
      </div>
    </div>
  );
}
