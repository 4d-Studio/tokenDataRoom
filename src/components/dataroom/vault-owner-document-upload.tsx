"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
  id: string;
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

  const allFiles = [
    ...existingFiles.map((f) => ({ entry: null as unknown as PendingEntry, file: f, isUploaded: true as const })),
    ...pending.map((entry) => ({ entry, file: { name: entry.file.name, sizeBytes: entry.file.size, mimeType: entry.file.type || "application/octet-stream" }, isUploaded: false as const })),
  ];

  const addFiles = useCallback(
    (rawFiles: FileList | null) => {
      setError("");
      if (!rawFiles?.length) return;
      for (const f of Array.from(rawFiles)) {
        if (f.size > FILE_SIZE_LIMIT_BYTES) {
          setError(`${f.name} exceeds the ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB limit.`);
          return;
        }
      }
      const newEntries: PendingEntry[] = Array.from(rawFiles).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      }));
      setPending((prev) => {
        const existingNames = new Set(prev.filter((p) => p.status !== "error").map((p) => p.file.name));
        return [
          ...prev,
          ...newEntries.filter((e) => !existingNames.has(e.file.name)),
        ];
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
    const toUpload = pending.filter((p) => p.status === "pending" || p.status === "error");
    if (!toUpload.length) return;
    setError("");
    setNeedsSignIn(false);
    sessionStorage.setItem(PW_STORAGE_KEY(slug), password);

    startTransition(async () => {
      for (const entry of toUpload) {
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

          // Remove done entries after 3s
          setTimeout(() => {
            setPending((prev) => prev.filter((p) => p.id !== entry.id));
          }, 3000);
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
  };

  const hasActive = pending.some((p) => p.status === "encrypting" || p.status === "uploading");
  const hasPending = pending.some((p) => p.status === "pending" || p.status === "error");
  const canUpload = hasPending && !hasActive && password.length >= 8;
  const uploadedCount = existingFiles.length;
  const doneCount = pending.filter((p) => p.status === "done").length;

  // ── Layout ────────────────────────────────────────────────────────────────

  const showPasswordField = !password || password.length < 8;

  const headerTitle = isFeatured ? "Add documents" : isCompact ? "Files" : "Upload files";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      {(!isCompact || existingFiles.length > 0 || pending.length > 0) && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn("font-semibold text-foreground", isCompact ? "text-sm" : "text-sm")}>
              {headerTitle}
            </h3>
            {!isCompact && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {uploadedCount > 0
                  ? `${uploadedCount} uploaded`
                  : "No files yet"}{" "}
                — files are encrypted in your browser before upload.
              </p>
            )}
          </div>
          {doneCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              {doneCount} uploaded
            </span>
          )}
        </div>
      )}

      {/* File list */}
      {allFiles.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {/* Already-uploaded files */}
          {existingFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-white px-4 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(f.sizeBytes)} · {formatMimeLabel(f.mimeType)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  Uploaded
                </span>
                <button
                  type="button"
                  onClick={() => removeUploaded(f.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Pending files */}
          {pending.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 bg-white px-4 py-3",
                entry.status === "error" && "bg-red-50/50",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{entry.file.name}</p>
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
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Remove"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Password field — shown when blank or files are pending */}
      {(showPasswordField || hasPending) && (
        <Field>
          <FieldLabel htmlFor="owner-upload-pw" className="text-xs">
            {showPasswordField
              ? "Room password"
              : "Password used for encryption"}
            <span className="ml-1.5 font-normal text-muted-foreground">(saved for this session)</span>
          </FieldLabel>
          <div className="relative">
            <Input
              id="owner-upload-pw"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              placeholder="Same password you set when creating the room"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 pr-16 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
      )}

      {/* Drop zone + Upload button row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
            "upload-zone flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-white py-5 text-center transition-colors",
            "hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="size-6 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium text-foreground">Drop files or click to browse</span>
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

        {/* Upload CTA */}
        {hasPending && (
          <Button
            type="button"
            onClick={uploadAll}
            disabled={!canUpload}
            aria-busy={hasActive}
            className="shrink-0"
          >
            {hasActive ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Encrypting…
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Upload {pending.filter((p) => p.status === "pending" || p.status === "error").length} file
                {pending.filter((p) => p.status === "pending" || p.status === "error").length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {needsSignIn && (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/login">Sign in to upload</Link>
        </Button>
      )}
    </div>
  );
}
