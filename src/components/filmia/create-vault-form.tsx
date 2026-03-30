"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileKey2,
  Lock,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { CopyButton } from "@/components/filmia/copy-button";
import { encryptFile } from "@/lib/filmia/client-crypto";
import { buildDefaultNdaText } from "@/lib/filmia/helpers";
import { DEFAULT_EXPIRATION_DAYS, FILE_SIZE_LIMIT_BYTES } from "@/lib/filmia/types";

type CreationResult = {
  slug: string;
  shareUrl: string;
  manageUrl: string;
};

const EXPIRATION_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

export const CreateVaultForm = ({
  defaultNdaText,
  defaultSenderCompany,
  defaultSenderName,
  storageMode,
}: {
  defaultNdaText: string;
  defaultSenderCompany: string;
  defaultSenderName: string;
  storageMode: "blob" | "local";
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderCompany, setSenderCompany] = useState(defaultSenderCompany);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [requiresNda, setRequiresNda] = useState(true);
  const [ndaText, setNdaText] = useState(defaultNdaText);
  const [ndaCustomized, setNdaCustomized] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_EXPIRATION_DAYS);
  const [error, setError] = useState("");
  const [statusLabel, setStatusLabel] = useState("Encrypt and create room");
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewTitle = title || file?.name || "Board Update Q2";
  const effectiveSenderName = senderName.trim() || defaultSenderName || "Filmia workspace";
  const effectiveSenderCompany = senderCompany.trim() || defaultSenderCompany;
  const generatedNdaText = useMemo(
    () => buildDefaultNdaText(effectiveSenderCompany),
    [effectiveSenderCompany],
  );
  const effectiveNdaText = ndaCustomized ? ndaText : generatedNdaText;
  const deferredNdaText = useDeferredValue(effectiveNdaText);

  const fileLabel = useMemo(() => {
    if (!file) {
      return "Drop one PDF, deck, contract, or image file";
    }

    const size = `${(file.size / 1024 / 1024).toFixed(file.size > 10_000_000 ? 0 : 1)} MB`;
    return `${file.name} · ${size}`;
  }, [file]);

  const submitCreation = async () => {
    if (!file) {
      setError("Choose a document to protect.");
      return;
    }

    if (file.size > FILE_SIZE_LIMIT_BYTES) {
      setError("Keep the first release to documents under 25 MB.");
      return;
    }

    if (!title.trim() || password.length < 8) {
      setError("Add a title and an 8+ character password.");
      return;
    }

    setError("");
    setCreationResult(null);
    setStatusLabel("Encrypting in your browser");

    const encryptionResult = await encryptFile(file, password);

    setStatusLabel("Creating your Filmia room");

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
        title,
        senderName: effectiveSenderName,
        senderCompany: effectiveSenderCompany,
        message,
        requiresNda,
        ndaText: effectiveNdaText,
        expiresInDays,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        salt: encryptionResult.salt,
        iv: encryptionResult.iv,
        pbkdf2Iterations: encryptionResult.pbkdf2Iterations,
      }),
    );

    const response = await fetch("/api/vaults", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as CreationResult & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to create a Filmia room.");
    }

    setCreationResult(payload);
    setStatusLabel("Room created");
  };

  return (
    <div className="items-start gap-8 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
      <section className="surface-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(16,24,40,0.1)] pb-6">
          <div>
            <p className="eyebrow">Create secure room</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-4xl">
              Protect one document in minutes.
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.1)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
            <span>
              {storageMode === "blob"
                ? "Production blob storage ready"
                : "Local storage active for development"}
            </span>
          </div>
        </div>

        <form
          className="mt-8 space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(() => {
              void submitCreation().catch((caughtError: unknown) => {
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Something went wrong while creating the room.",
                );
                setStatusLabel("Encrypt and create room");
              });
            });
          }}
        >
          <label className="space-y-3">
            <span className="label-title">1. Choose the document</span>
            <span className="upload-zone">
              <Upload className="h-5 w-5 text-[var(--color-accent)]" />
              <span className="text-base font-medium text-[var(--color-foreground)]">
                {fileLabel}
              </span>
              <span className="text-sm text-[var(--color-muted)]">
                First release supports one file per room, up to 25 MB.
              </span>
              <input
                className="sr-only"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-3 sm:col-span-2">
              <span className="label-title">2. Name the room</span>
              <input
                className="field-input"
                placeholder="Q2 investor update"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="space-y-3 sm:col-span-2">
              <span className="label-title">Password</span>
              <input
                className="field-input"
                placeholder="Minimum 8 characters"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          <details className="calm-block group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--color-foreground)]">
              Advanced settings
              <ChevronDown className="h-4 w-4 text-[var(--color-muted)] transition group-open:rotate-180" />
            </summary>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="space-y-3">
                <span className="label-title">Sender name</span>
                <input
                  className="field-input"
                  placeholder="Ava Chen"
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                />
              </label>
              <label className="space-y-3">
                <span className="label-title">Sender company</span>
                <input
                  className="field-input"
                  placeholder="Northlight Labs"
                  value={senderCompany}
                  onChange={(event) => setSenderCompany(event.target.value)}
                />
              </label>
              <label className="space-y-3">
                <span className="label-title">Expires after</span>
                <select
                  className="field-input"
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(Number(event.target.value))}
                >
                  {EXPIRATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-3">
                <span className="label-title">Require NDA</span>
                <button
                  type="button"
                  onClick={() => setRequiresNda((value) => !value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    requiresNda
                      ? "border-[var(--color-accent)] bg-[rgba(52,93,255,0.06)] text-[var(--color-foreground)]"
                      : "border-[rgba(16,24,40,0.12)] bg-white text-[var(--color-muted)]"
                  }`}
                >
                  <FileKey2 className="h-4 w-4" />
                  {requiresNda ? "NDA required" : "NDA optional"}
                </button>
              </div>
              <label className="space-y-3 sm:col-span-2">
                <span className="label-title">Room note shown to recipients</span>
                <textarea
                  className="field-input min-h-28 resize-none"
                  placeholder="Add context, review instructions, or anything the recipient should see first."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              {requiresNda ? (
                <label className="space-y-3 sm:col-span-2">
                  <span className="label-title">NDA text</span>
                  <textarea
                    className="field-input min-h-32 resize-none"
                    value={effectiveNdaText}
                    onChange={(event) => {
                      setNdaCustomized(true);
                      setNdaText(event.target.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNdaCustomized(false);
                      setNdaText("");
                    }}
                    className="inline-flex w-fit text-sm font-medium text-[var(--color-accent)] transition hover:opacity-80"
                  >
                    Reset to company template
                  </button>
                </label>
              ) : null}
            </div>
          </details>

          {error ? (
            <div className="rounded-2xl border border-[#f1b8ae] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f3d2f]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? statusLabel : "Encrypt and create room"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="max-w-md text-sm leading-6 text-[var(--color-muted)]">
              The password stays in the browser. Share it separately from the link.
            </p>
          </div>
        </form>

        {creationResult ? (
          <div className="mt-8 border-t border-[rgba(16,24,40,0.1)] pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 text-[var(--color-accent)]" />
              <div className="space-y-4">
                <div>
                  <p className="label-title">Filmia room created</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                    Send the room link and share the password separately. Keep the
                    management link private so you can revoke access or review activity.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[rgba(16,24,40,0.1)] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
                      Share link
                    </div>
                    <div className="mt-2 break-all text-sm text-[var(--color-foreground)]">
                      {creationResult.shareUrl}
                    </div>
                    <div className="mt-3">
                      <CopyButton value={creationResult.shareUrl} label="Copy share link" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[rgba(16,24,40,0.1)] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
                      Management link
                    </div>
                    <div className="mt-2 break-all text-sm text-[var(--color-foreground)]">
                      {creationResult.manageUrl}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <CopyButton value={creationResult.manageUrl} label="Copy management link" />
                      <Link href={creationResult.manageUrl} className="text-sm font-medium text-[var(--color-accent)]">
                        Open room controls
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="surface-panel mt-8 p-6 sm:p-8 lg:mt-0 lg:sticky lg:top-6">
        <div className="border-b border-[rgba(16,24,40,0.1)] pb-6">
          <p className="eyebrow">Recipient preview</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--color-muted)]">
            This is how the room will read before the recipient unlocks the file.
          </p>
        </div>
        <div className="mt-8 rounded-[1.25rem] border border-[rgba(16,24,40,0.1)] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-[var(--color-ink)]">{previewTitle}</div>
              <div className="mt-2 text-sm text-[var(--color-muted)]">
                Shared by {effectiveSenderName}
                {effectiveSenderCompany ? ` · ${effectiveSenderCompany}` : ""}
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">
              Protected
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="preview-chip">
              <Lock className="h-4 w-4 text-[var(--color-accent)]" />
              Password required before decryption
            </div>
            <div className="preview-chip">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              {requiresNda ? "NDA accepted before access" : "NDA not required"}
            </div>
            <div className="preview-chip">
              <Eye className="h-4 w-4 text-[var(--color-accent)]" />
              The sender can see when this room is opened
            </div>
          </div>

          {message ? (
            <div className="mt-8 rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[#fbfcff] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Sender note
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-foreground)]">{message}</p>
            </div>
          ) : null}

          <div className="mt-8 border-t border-[rgba(16,24,40,0.1)] pt-6">
            <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Recipient experience
            </div>
            <ol className="mt-4 space-y-4 text-sm leading-7 text-[var(--color-foreground)]">
              <li className="flex gap-3">
                <span className="step-index">01</span>
                Review the room title and sender context.
              </li>
              <li className="flex gap-3">
                <span className="step-index">02</span>
                {requiresNda
                  ? "Accept the NDA and identify the reviewing party."
                  : "Enter the password shared separately."}
              </li>
              <li className="flex gap-3">
                <span className="step-index">03</span>
                Decrypt the file in-browser and download securely.
              </li>
            </ol>
          </div>

          {requiresNda ? (
            <div className="mt-8 border-t border-[rgba(16,24,40,0.1)] pt-4">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
                NDA preview
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                {deferredNdaText}
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
};
