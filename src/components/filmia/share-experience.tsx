"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { formatBytes, formatDateTime } from "@/lib/filmia/helpers";
import { decryptFile } from "@/lib/filmia/client-crypto";
import type {
  VaultAcceptanceRecord,
  VaultRecord,
} from "@/lib/filmia/types";

type AccessResponse = {
  acceptance?: VaultAcceptanceRecord;
  error?: string;
  signedNdaUrl?: string;
  success?: boolean;
};

const sectionLinkClass =
  "rounded-full border border-[rgba(16,24,40,0.1)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-foreground)]";

export const ShareExperience = ({
  metadata,
  initialAcceptance,
  initialAccessGranted,
}: {
  metadata: VaultRecord;
  initialAcceptance: VaultAcceptanceRecord | null;
  initialAccessGranted: boolean;
}) => {
  const [accessGranted, setAccessGranted] = useState(initialAccessGranted);
  const [acceptance, setAcceptance] = useState(initialAcceptance);
  const [signerName, setSignerName] = useState(initialAcceptance?.signerName ?? "");
  const [signerEmail, setSignerEmail] = useState(initialAcceptance?.signerEmail ?? "");
  const [signerCompany, setSignerCompany] = useState(initialAcceptance?.signerCompany ?? "");
  const [signerAddress, setSignerAddress] = useState(initialAcceptance?.signerAddress ?? "");
  const [signatureName, setSignatureName] = useState(initialAcceptance?.signatureName ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signedNdaUrl, setSignedNdaUrl] = useState(
    initialAcceptance ? `/api/vaults/${metadata.slug}/signed-nda` : "",
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState(metadata.fileName);
  const [isPending, startTransition] = useTransition();

  const previewable =
    metadata.mimeType.startsWith("image/") ||
    metadata.mimeType === "application/pdf" ||
    metadata.mimeType.startsWith("text/");
  const ndaStepComplete = !metadata.requiresNda || accessGranted;

  const navigationItems = useMemo(
    () =>
      [
        { href: "#overview", label: "Overview" },
        metadata.requiresNda ? { href: "#nda", label: "NDA" } : null,
        { href: "#document", label: "Document" },
        { href: "#tracking", label: "Tracking" },
      ].filter(Boolean) as Array<{ href: string; label: string }>,
    [metadata.requiresNda],
  );

  useEffect(() => {
    void fetch(`/api/vaults/${metadata.slug}/view`, { method: "POST" });
  }, [metadata.slug]);

  useEffect(
    () => () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    },
    [objectUrl],
  );

  const acceptNda = async () => {
    setError("");
    setSuccess("");

    const response = await fetch(`/api/vaults/${metadata.slug}/access`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        signerName,
        signerEmail,
        signerCompany,
        signerAddress,
        signatureName,
      }),
    });

    const payload = (await response.json()) as AccessResponse;

    if (!response.ok) {
      throw new Error(payload.error || "Unable to record NDA acceptance.");
    }

    setAcceptance(payload.acceptance ?? null);
    setSignedNdaUrl(payload.signedNdaUrl ?? "");
    setAccessGranted(true);
    setSuccess("NDA accepted. The signed copy is ready, and you can now unlock the document.");
  };

  const unlockDocument = async () => {
    setError("");
    setSuccess("");

    const response = await fetch(`/api/vaults/${metadata.slug}/bundle`, {
      method: "GET",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Unable to fetch document." }))) as {
        error?: string;
      };
      throw new Error(payload.error || "Unable to fetch document.");
    }

    const encryptedBytes = await response.arrayBuffer();
    const decrypted = await decryptFile({
      encryptedBytes,
      password,
      salt: metadata.salt,
      iv: metadata.iv,
      pbkdf2Iterations: metadata.pbkdf2Iterations,
    });

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    const blob = new Blob([decrypted], { type: metadata.mimeType });
    const nextObjectUrl = URL.createObjectURL(blob);
    setObjectUrl(nextObjectUrl);
    setDownloadName(metadata.fileName);
    setSuccess("Document decrypted locally. You can review it here or download it now.");

    if (!previewable) {
      const link = document.createElement("a");
      link.href = nextObjectUrl;
      link.download = metadata.fileName;
      link.click();
    }
  };

  return (
    <div className="items-start gap-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="surface-panel p-6 sm:p-8 lg:sticky lg:top-6">
        <p className="eyebrow">Data room</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {metadata.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          Shared by {metadata.senderName}
          {metadata.senderCompany ? ` · ${metadata.senderCompany}` : ""}.
        </p>

        <div className="mt-6 grid gap-2">
          <div className="preview-chip">
            <FileText className="h-4 w-4 text-[var(--color-accent)]" />
            {metadata.fileName} · {formatBytes(metadata.fileSize)}
          </div>
          <div className="preview-chip">
            <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
            {metadata.requiresNda ? "NDA required before file access" : "Password required"}
          </div>
          <div className="preview-chip">
            <Eye className="h-4 w-4 text-[var(--color-accent)]" />
            Opens and downloads are tracked for the sender
          </div>
        </div>

        <nav className="mt-8 border-t border-[rgba(16,24,40,0.1)] pt-6">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Navigation
          </div>
          <div className="mt-4 space-y-2">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="block rounded-[0.9rem] px-3 py-2 text-sm text-[var(--color-foreground)] transition hover:bg-[rgba(52,93,255,0.05)]">
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {metadata.message ? (
          <div className="mt-8 rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Note from sender
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--color-foreground)]">
              {metadata.message}
            </p>
          </div>
        ) : null}

        {signedNdaUrl ? (
          <a
            href={signedNdaUrl}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] transition hover:opacity-80"
          >
            <Download className="h-4 w-4" />
            Download signed NDA copy
          </a>
        ) : null}
      </aside>

      <section className="mt-8 space-y-6 lg:mt-0">
        <div className="surface-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(16,24,40,0.1)] pb-5">
            <div>
              <p className="eyebrow">Room review</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                Review, sign, and unlock
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.1)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
              {ndaStepComplete ? "Ready to unlock document" : "NDA review required"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className={sectionLinkClass}>
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <section id="overview" className="surface-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Overview</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {metadata.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                This room is designed for one controlled document review. Complete the
                access steps on the left, then review the unlocked file on the right.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Protected
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
              <div className="label-title">Document</div>
              <div className="mt-2 text-sm text-[var(--color-foreground)]">{metadata.fileName}</div>
            </div>
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
              <div className="label-title">Expires</div>
              <div className="mt-2 text-sm text-[var(--color-foreground)]">
                {formatDateTime(metadata.expiresAt)}
              </div>
            </div>
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
              <div className="label-title">Tracking</div>
              <div className="mt-2 text-sm text-[var(--color-foreground)]">
                Opens, NDA acceptance, and downloads are recorded
              </div>
            </div>
          </div>

          {metadata.message ? (
            <div className="mt-6 rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.85)] p-5">
              <div className="label-title">Admin note</div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-foreground)]">
                {metadata.message}
              </p>
            </div>
          ) : null}
        </section>

        {metadata.requiresNda ? (
          <section id="nda" className="surface-panel p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">NDA</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Sign before access
                </h3>
              </div>
              {acceptance ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(52,93,255,0.18)] bg-[rgba(52,93,255,0.06)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                  Signed {formatDateTime(acceptance.acceptedAt)}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-5 text-sm leading-7 text-[var(--color-muted)]">
              {metadata.ndaText}
            </div>

            {!accessGranted ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="field-input"
                    placeholder="Full name"
                    value={signerName}
                    onChange={(event) => setSignerName(event.target.value)}
                  />
                  <input
                    className="field-input"
                    placeholder="Work email"
                    value={signerEmail}
                    onChange={(event) => setSignerEmail(event.target.value)}
                  />
                  <input
                    className="field-input sm:col-span-2"
                    placeholder="Company (optional)"
                    value={signerCompany}
                    onChange={(event) => setSignerCompany(event.target.value)}
                  />
                  <textarea
                    className="field-input min-h-32 resize-none sm:col-span-2"
                    placeholder="Signer address"
                    value={signerAddress}
                    onChange={(event) => setSignerAddress(event.target.value)}
                  />
                  <input
                    className="field-input sm:col-span-2"
                    placeholder="Type your full name as signature"
                    value={signatureName}
                    onChange={(event) => setSignatureName(event.target.value)}
                  />
                </div>

                <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.85)] p-5">
                  <div className="label-title">Mock signature line</div>
                  <div className="mt-5 rounded-[0.9rem] border border-[rgba(16,24,40,0.08)] bg-white px-4 py-5">
                    <div className="min-h-12 border-b border-[rgba(16,24,40,0.2)] pb-2 font-serif text-2xl text-[var(--color-foreground)]">
                      {signatureName || "Your signature will appear here"}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Electronic signature acknowledgement
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        void acceptNda().catch((caughtError: unknown) => {
                          setError(
                            caughtError instanceof Error
                              ? caughtError.message
                              : "Unable to accept the NDA.",
                          );
                        });
                      })
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Sign NDA and continue
                  </button>
                </div>
              </div>
            ) : acceptance ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.85)] p-5">
                  <div className="label-title">Accepted by</div>
                  <div className="mt-3 text-sm font-semibold text-[var(--color-foreground)]">
                    {acceptance.signerName}
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-muted)]">
                    {acceptance.signerEmail}
                    {acceptance.signerCompany ? ` · ${acceptance.signerCompany}` : ""}
                  </div>
                  <div className="mt-4 inline-flex items-start gap-2 text-sm leading-6 text-[var(--color-foreground)]">
                    <MapPin className="mt-1 h-4 w-4 text-[var(--color-accent)]" />
                    <span>{acceptance.signerAddress}</span>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-5">
                  <div className="label-title">Signature</div>
                  <div className="mt-5 border-b border-[rgba(16,24,40,0.2)] pb-2 font-serif text-2xl text-[var(--color-foreground)]">
                    {acceptance.signatureName}
                  </div>
                  <div className="mt-3 text-sm text-[var(--color-muted)]">
                    {formatDateTime(acceptance.acceptedAt)}
                  </div>
                  {signedNdaUrl ? (
                    <a
                      href={signedNdaUrl}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] transition hover:opacity-80"
                    >
                      <Download className="h-4 w-4" />
                      Download signed NDA copy
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section id="document" className="surface-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Document review</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                Review the protected file
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                The document is decrypted only in your browser after you enter the password
                shared separately by the sender.
              </p>
            </div>
            {objectUrl ? (
              <a
                href={objectUrl}
                download={downloadName}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.12)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
              >
                <Download className="h-4 w-4 text-[var(--color-accent)]" />
                Download file
              </a>
            ) : null}
          </div>

          {metadata.status !== "active" ? (
            <div className="mt-6 rounded-[1rem] border border-[#f1b8ae] bg-[#fff4f2] p-5 text-sm leading-7 text-[#9f3d2f]">
              This Filmia room is no longer active. Contact the sender if you still need access.
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <input
                  className="field-input max-w-md"
                  placeholder="Enter password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={!ndaStepComplete}
                />
                <button
                  type="button"
                  disabled={isPending || !ndaStepComplete}
                  onClick={() =>
                    startTransition(() => {
                      void unlockDocument().catch((caughtError: unknown) => {
                        setError(
                          caughtError instanceof Error
                            ? caughtError.message
                            : "Unable to unlock the document.",
                        );
                      });
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.12)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Lock className="h-4 w-4 text-[var(--color-accent)]" />
                  Unlock document
                </button>
              </div>

              {!objectUrl ? (
                <div className="mt-6 rounded-[1.25rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.85)] p-10 text-center">
                  <FileText className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
                  <div className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
                    Document viewer is locked
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                    {ndaStepComplete
                      ? "Enter the password to decrypt the file and load the review surface."
                      : "Complete the NDA first, then enter the password to review the document."}
                  </p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-[rgba(16,24,40,0.1)] bg-white">
                  {previewable ? (
                    metadata.mimeType.startsWith("image/") ? (
                      <Image
                        src={objectUrl}
                        alt={downloadName}
                        width={1600}
                        height={1200}
                        unoptimized
                        className="h-auto w-full"
                      />
                    ) : metadata.mimeType === "application/pdf" ? (
                      <iframe title={downloadName} src={objectUrl} className="h-[760px] w-full" />
                    ) : (
                      <iframe title={downloadName} src={objectUrl} className="h-[560px] w-full" />
                    )
                  ) : (
                    <div className="p-8 text-sm leading-7 text-[var(--color-muted)]">
                      This file type is available for secure download but not inline preview.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section id="tracking" className="surface-panel p-6 sm:p-8">
          <p className="eyebrow">Tracking</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
            What the sender can see
          </h3>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4 text-sm leading-7 text-[var(--color-foreground)]">
              When this room is opened
            </div>
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4 text-sm leading-7 text-[var(--color-foreground)]">
              Who signed the NDA and the address provided
            </div>
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4 text-sm leading-7 text-[var(--color-foreground)]">
              When the encrypted file or signed NDA copy is downloaded
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-[1rem] border border-[#f1b8ae] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f3d2f]">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(52,93,255,0.2)] bg-[rgba(52,93,255,0.05)] px-4 py-3 text-sm text-[var(--color-foreground)]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />
            {success}
          </div>
        ) : null}
      </section>
    </div>
  );
};
