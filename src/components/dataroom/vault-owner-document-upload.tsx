"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { encryptFile } from "@/lib/dataroom/client-crypto";
import { FILE_SIZE_LIMIT_BYTES } from "@/lib/dataroom/types";
import { formatBytes } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import type { VaultEvent, VaultRecord } from "@/lib/dataroom/types";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  ownerKey: string;
  metadata: VaultRecord;
  onUploaded: (metadata: VaultRecord, events: VaultEvent[]) => void;
  /** `featured` / `compact` — manage page layouts; `default` — sidebar-style. */
  variant?: "default" | "featured" | "compact";
};

export function VaultOwnerDocumentUpload({
  slug,
  ownerKey,
  metadata,
  onUploaded,
  variant = "default",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const hasDocument = metadata.hasEncryptedFile !== false;
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  const onFiles = useCallback((list: FileList | null) => {
    const next = list?.[0] ?? null;
    setError("");
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > FILE_SIZE_LIMIT_BYTES) {
      setError(`File is too large (max ${(FILE_SIZE_LIMIT_BYTES / 1024 / 1024).toFixed(0)} MB).`);
      setFile(null);
      return;
    }
    setFile(next);
  }, []);

  const upload = () => {
    if (!file || !password || password.length < 8) {
      setError(password.length < 8 ? "Enter the room password (min. 8 characters)." : "Choose a file.");
      return;
    }
    setError("");
    setNeedsSignIn(false);
    startTransition(async () => {
      try {
        const encryptionResult = await encryptFile(file, password);
        const formData = new FormData();
        formData.append(
          "encryptedFile",
          new File([encryptionResult.encryptedBytes], `${file.name}.filmia`, {
            type: "application/octet-stream",
          }),
        );
        formData.append(
          "metadata",
          JSON.stringify({
            ownerKey,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            salt: encryptionResult.salt,
            iv: encryptionResult.iv,
            pbkdf2Iterations: encryptionResult.pbkdf2Iterations,
          }),
        );

        const res = await fetch(`/api/vaults/${slug}/payload`, { method: "POST", body: formData });
        const data = (await res.json()) as {
          error?: string;
          code?: string;
          metadata?: VaultRecord;
          events?: VaultEvent[];
        };

        if (res.status === 401 && data.code === "LOGIN_REQUIRED") {
          setNeedsSignIn(true);
          throw new Error(
            "SIGN_IN_REQUIRED|Sign in with the workspace account that created this room, then upload again.",
          );
        }

        if (!res.ok || !data.metadata || !data.events) {
          throw new Error(data.error || "Upload failed.");
        }

        setFile(null);
        setPassword("");
        if (inputRef.current) inputRef.current.value = "";
        onUploaded(data.metadata, data.events);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed.";
        if (msg.startsWith("SIGN_IN_REQUIRED|")) {
          setError(msg.slice("SIGN_IN_REQUIRED|".length));
        } else {
          setError(msg);
        }
      }
    });
  };

  if (hasDocument) {
    if (isFeatured || isCompact) {
      const pad = isCompact ? "p-3.5" : "p-5";
      const iconBox = isCompact ? "size-11" : "size-14";
      const iconSz = isCompact ? "size-6" : "size-7";
      return (
        <div className={`flex gap-3 rounded-xl border border-border bg-card shadow-sm ${pad}`}>
          <div
            className={`flex ${iconBox} shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50`}
          >
            <FileText className={`${iconSz} text-muted-foreground`} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Encrypted file
            </p>
            <p className={`mt-0.5 truncate font-semibold text-foreground ${isCompact ? "text-sm" : "text-base"}`}>
              {metadata.fileName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBytes(metadata.fileSize)} · {formatMimeLabel(metadata.mimeType)}
            </p>
            {!isCompact ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                One bundle per room. New file → new room.
              </p>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Encrypted document
        </p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{metadata.fileName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatBytes(metadata.fileSize)} · {formatMimeLabel(metadata.mimeType)}
        </p>
      </div>
    );
  }

  const dropMinH = isFeatured ? "min-h-[12rem] sm:min-h-[14rem]" : isCompact ? "min-h-[7.5rem]" : "min-h-[9rem]";
  const titleClass = isFeatured ? "text-lg font-semibold text-foreground" : isCompact ? "text-sm font-semibold text-foreground" : "text-sm font-semibold text-foreground";

  const passwordField = (
    <Field className={isCompact ? "gap-1.5" : undefined}>
      <FieldLabel htmlFor="owner-upload-pw" className={isCompact ? "text-xs" : undefined}>
        Room password <span className="font-normal text-muted-foreground">(for encryption)</span>
      </FieldLabel>
      <Input
        id="owner-upload-pw"
        type="password"
        autoComplete="off"
        placeholder="Same password you set when creating the room"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={isCompact ? "h-9 text-sm" : undefined}
      />
    </Field>
  );

  const dropZone = (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      className={
        "upload-zone flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition-colors " +
        dropMinH +
        " " +
        (isDragging
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
          : "border-border bg-muted/30 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5")
      }
      onClick={() => inputRef.current?.click()}
    >
      <Upload
        className={
          isFeatured ? "size-10 text-muted-foreground" : isCompact ? "size-7 text-muted-foreground" : "size-8 text-muted-foreground"
        }
      />
      <div>
        <p
          className={
            isFeatured
              ? "text-base font-medium text-foreground"
              : isCompact
                ? "text-sm font-medium text-foreground"
                : "text-sm font-medium text-foreground"
          }
        >
          {file ? file.name : "Drop file or click to browse"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${formatMimeLabel(file.type || "application/octet-stream")}`
            : "PDF, Office, images, text · max 25 MB"}
        </p>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );

  return (
    <div className={cn("flex flex-col", isFeatured ? "gap-2.5" : "gap-3")}>
      <div>
        <h3 className={titleClass}>{isFeatured ? "Add a document" : "Add encrypted file"}</h3>
        {!isCompact ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {isFeatured
              ? "Use the room password to encrypt in your browser, then upload."
              : "Uses your room password, then encrypts in the browser before upload."}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">Password first, then file — all encryption stays in your browser.</p>
        )}
      </div>

      {/* Password before file: separate step in the flow */}
      {passwordField}
      {dropZone}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {needsSignIn ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/login">Sign in to upload</Link>
        </Button>
      ) : null}

      <Button
        type="button"
        size={isCompact ? "sm" : "sm"}
        disabled={isPending || !file}
        onClick={upload}
        className={isFeatured ? "w-full sm:w-auto" : "w-fit"}
      >
        {isPending ? "Encrypting & uploading…" : "Upload encrypted file"}
      </Button>
    </div>
  );
}
