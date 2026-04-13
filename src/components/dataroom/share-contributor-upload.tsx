"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { encryptFile } from "@/lib/dataroom/client-crypto";
import type { VaultEvent, VaultRecord } from "@/lib/dataroom/types";

type ShareContributorUploadStripProps = {
  slug: string;
  vaultPassword: string;
  onRoomUpdated: (next: { metadata: VaultRecord; events: VaultEvent[] }) => void;
  onRetryDecrypt: (password: string) => void;
};

/**
 * Lets a contributor add a ciphertext file using the same room password they used to decrypt.
 * Metadata is marked server-side with the signed-in email so only that contributor can remove it later.
 */
export function ShareContributorUploadStrip({
  slug,
  vaultPassword,
  onRoomUpdated,
  onRetryDecrypt,
}: ShareContributorUploadStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const runUpload = useCallback(
    (file: File) => {
      if (!vaultPassword || vaultPassword.length < 8) {
        setMessage("Unlock files with the room password first (8+ characters).");
        return;
      }
      setMessage("");
      startTransition(async () => {
        try {
          const encrypted = await encryptFile(file, vaultPassword);
          const formData = new FormData();
          formData.append(
            "metadata",
            JSON.stringify({
              contributorUpload: true as const,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              fileSize: file.size,
              salt: encrypted.salt,
              iv: encrypted.iv,
              pbkdf2Iterations: encrypted.pbkdf2Iterations,
            }),
          );
          formData.append(
            "encryptedFile",
            new File([encrypted.encryptedBytes], `${file.name}.filmia`, {
              type: "application/octet-stream",
            }),
          );
          const res = await fetch(`/api/vaults/${slug}/payload`, {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as {
            error?: string;
            metadata?: VaultRecord;
            events?: VaultEvent[];
          };
          if (!res.ok || !data.metadata || !data.events) {
            throw new Error(data.error || "Upload failed.");
          }
          onRoomUpdated({ metadata: data.metadata, events: data.events });
          onRetryDecrypt(vaultPassword);
          setMessage("Upload complete — your file appears in the list.");
          setTimeout(() => setMessage(""), 4000);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Upload failed.");
        }
      });
    },
    [slug, vaultPassword, onRoomUpdated, onRetryDecrypt],
  );

  return (
    <div className="rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/40 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Add your files
          </p>
          <p className="text-xs leading-snug text-[color:var(--tkn-text-support)]">
            Use the same room password you used to unlock. Everything is encrypted in this browser before upload. The
            file list below includes everyone&apos;s documents; only your uploads show a remove control.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            aria-label="Choose a file to encrypt and upload to this room"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.txt,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) runUpload(f);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="gap-1.5 border-[color:var(--tkn-panel-border)] bg-card"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {busy ? "Uploading…" : "Upload encrypted file"}
          </Button>
        </div>
      </div>
      {message ? (
        <p
          className="mt-2 text-xs leading-snug text-[color:var(--tkn-text-support)]"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
