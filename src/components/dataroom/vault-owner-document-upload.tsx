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

type Props = {
  slug: string;
  ownerKey: string;
  metadata: VaultRecord;
  onUploaded: (metadata: VaultRecord, events: VaultEvent[]) => void;
  /** `featured` — owner-page primary column: larger drop zone and document tile. */
  variant?: "default" | "featured";
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
    if (variant === "featured") {
      return (
        <div className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
            <FileText className="size-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Encrypted document in this room
            </p>
            <p className="mt-1.5 truncate text-base font-semibold text-foreground">
              {metadata.fileName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatBytes(metadata.fileSize)} · {formatMimeLabel(metadata.mimeType)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Each room stores one encrypted bundle. To share a different file, create another room.
            </p>
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

  const dropMinH =
    variant === "featured" ? "min-h-[12rem] sm:min-h-[14rem]" : "min-h-[9rem]";
  const titleClass =
    variant === "featured" ? "text-lg font-semibold text-foreground" : "text-sm font-semibold text-foreground";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className={titleClass}>Add a document</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag and drop a file, then enter the same password you set for this room. It encrypts in
          your browser before upload.
        </p>
      </div>

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
          "upload-zone flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors " +
          dropMinH +
          " " +
          (isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
            : "border-border bg-muted/30 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/5")
        }
        onClick={() => inputRef.current?.click()}
      >
        <Upload className={variant === "featured" ? "size-10 text-muted-foreground" : "size-8 text-muted-foreground"} />
        <div>
          <p
            className={
              variant === "featured"
                ? "text-base font-medium text-foreground"
                : "text-sm font-medium text-foreground"
            }
          >
            {file ? file.name : "Drop a file here or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${formatMimeLabel(file.type || "application/octet-stream")}`
              : "PDF, Office, images, text — up to 25 MB"}
          </p>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <Field>
        <FieldLabel htmlFor="owner-upload-pw">Room password</FieldLabel>
        <Input
          id="owner-upload-pw"
          type="password"
          autoComplete="off"
          placeholder="Same password you set when creating the room"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {needsSignIn ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/login">Sign in to upload</Link>
        </Button>
      ) : null}

      <Button type="button" size="sm" disabled={isPending || !file} onClick={upload}>
        {isPending ? "Encrypting & uploading…" : "Upload encrypted file"}
      </Button>
    </div>
  );
}
