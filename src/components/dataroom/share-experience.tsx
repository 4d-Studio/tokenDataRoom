"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { MobileShareViewer } from "@/components/dataroom/mobile-share-viewer";
import {
  SHARE_RECIPIENT_DISCLAIMER,
  ShareRecipientCompactHeader,
} from "@/components/dataroom/share-entry-welcome";
import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { ViewerWatermarkOverlay } from "@/components/dataroom/viewer-watermark-overlay";
import { decryptFile } from "@/lib/dataroom/client-crypto";
import { getOrCreateViewerBinding } from "@/lib/dataroom/viewer-binding-client";
import { sanitizeHtml } from "@/lib/dataroom/sanitize";
import { ChevronLeft, Mail } from "lucide-react";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import { isRichNdaContent } from "@/components/dataroom/rich-text-editor";
import {
  vaultHasEncryptedDocument,
  type VaultAcceptanceRecord,
  type VaultRecord,
} from "@/lib/dataroom/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";

type AccessResponse = {
  acceptance?: VaultAcceptanceRecord;
  error?: string;
  signedNdaUrl?: string;
  success?: boolean;
  pendingEmail?: boolean;
};

type NdaFlowStep = "identity" | "review" | "sign";

type NdaFormDraft = {
  signerName: string;
  signerEmail: string;
  signerCompany: string;
  signerAddress: string;
  signatureName: string;
};

export function ShareExperience({
  metadata,
  initialAcceptance,
  initialAccessGranted,
  ndaCardTitle,
  ndaCardDescription,
  ndaDocumentText,
  ndaPostPath,
  ndaAcceptSuccessMessage,
  needsBootstrapFromWorkspace = false,
  shareHostLabel = "",
  workspaceLogoUrl,
  workspaceCompanyName,
}: {
  metadata: VaultRecord;
  initialAcceptance: VaultAcceptanceRecord | null;
  initialAccessGranted: boolean;
  ndaCardTitle: string;
  ndaCardDescription: ReactNode;
  ndaDocumentText: string;
  ndaPostPath: string;
  ndaAcceptSuccessMessage: string;
  needsBootstrapFromWorkspace?: boolean;
  shareHostLabel?: string;
  workspaceLogoUrl?: string | null;
  workspaceCompanyName?: string | null;
}) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [accessGranted, setAccessGranted] = useState(initialAccessGranted);
  const [acceptance, setAcceptance] = useState(initialAcceptance);
  const [signatureImage, setSignatureImage] = useState<string | undefined>(
    initialAcceptance?.signatureImage,
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState(metadata.fileName);
  // Map of fileId → decrypted blob URL + filename (multi-file support)
  const [decryptedFiles, setDecryptedFiles] = useState<Record<string, { objectUrl: string; downloadName: string }>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signedNdaUrl, setSignedNdaUrl] = useState(
    initialAcceptance ? `/api/vaults/${metadata.slug}/signed-nda` : "",
  );
  const [isPending, startTransition] = useTransition();
  const [ndaStep, setNdaStep] = useState<NdaFlowStep>("identity");
  const [ndaReadConfirmed, setNdaReadConfirmed] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Return-visit email gate
  const [returnEmail, setReturnEmail] = useState("");
  const [returnStep, setReturnStep] = useState<"email" | "code">("email");
  const [showReturnGate, setShowReturnGate] = useState(true);
  const [returnCode, setReturnCode] = useState("");
  const [savedAccessMessage, setSavedAccessMessage] = useState("");
  const [ndaDraft, setNdaDraft] = useState<NdaFormDraft>(() => ({
    signerName: initialAcceptance?.signerName ?? "",
    signerEmail: initialAcceptance?.signerEmail ?? "",
    signerCompany: initialAcceptance?.signerCompany ?? "",
    signerAddress: initialAcceptance?.signerAddress ?? "",
    signatureName: initialAcceptance?.signatureName ?? "",
  }));

  const hasDocument = vaultHasEncryptedDocument(metadata);

  const viewerWatermarkLabel =
    acceptance?.signerEmail && objectUrl && hasDocument
      ? `${acceptance.signerEmail} · ${acceptance.signerName || "Viewer"} · ${new Date().toLocaleDateString()}`
      : objectUrl && hasDocument
        ? `Confidential · ${metadata.title}`
        : "";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    void fetch(`/api/vaults/${metadata.slug}/view`, { method: "POST" });
  }, [metadata.slug]);

  // Fetch file manifest when access is granted or room doesn't require NDA
  const [filesList, setFilesList] = useState<Array<{ id: string; name: string; mimeType: string; sizeBytes: number; category?: string }>>([]);
  const [fetchedFiles, setFetchedFiles] = useState(false);
  useEffect(() => {
    if (!accessGranted && metadata.requiresNda) return;
    if (fetchedFiles) return;
    setFetchedFiles(true);
    void (async () => {
      try {
        const res = await fetch(`/api/vaults/${metadata.slug}/bundle`);
        if (res.ok) {
          const data = (await res.json()) as { files?: Array<{ id: string; name: string; mimeType: string; sizeBytes: number; category?: string }> };
          if (data.files) setFilesList(data.files);
        }
      } catch { /* non-fatal */ }
    })();
  }, [accessGranted, metadata.requiresNda, metadata.slug, fetchedFiles]);

  // Auto-decrypt on mount/refresh if password is saved in sessionStorage
  const autoDecryptAttempted = useRef(false);
  useEffect(() => {
    if (autoDecryptAttempted.current) return;
    if (!fetchedFiles || !filesList.length) return;
    if (Object.keys(decryptedFiles).length > 0) return;
    if (!accessGranted && metadata.requiresNda) return;
    try {
      const savedPw = sessionStorage.getItem(`tkn_share_pw_${metadata.slug}`);
      if (savedPw) {
        autoDecryptAttempted.current = true;
        handleUnlock(savedPw);
      }
    } catch {
      // sessionStorage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedFiles, filesList.length, accessGranted]);

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  useEffect(() => {
    if (!needsBootstrapFromWorkspace) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/vaults/${metadata.slug}/bootstrap-workspace-access`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            viewerBinding: getOrCreateViewerBinding(metadata.slug),
          }),
        });
        if (res.ok && !cancelled) router.refresh();
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsBootstrapFromWorkspace, metadata.slug, router]);

  // ── Mobile ─────────────────────────────────────────────────────
  if (isMobile) {
    const handleSignNda = (fields: {
      signerName: string;
      signerEmail: string;
      signerCompany: string;
      signerAddress: string;
      signatureName: string;
      signatureImage?: string;
      rememberMe?: boolean;
    }) => {
      startTransition(async () => {
        setError("");
        try {
          const res = await fetch(ndaPostPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...fields,
              viewerBinding: getOrCreateViewerBinding(metadata.slug),
            }),
          });
          const data = (await res.json()) as AccessResponse;
          if (!res.ok) throw new Error(data.error || "Unable to accept NDA.");
          setAcceptance(data.acceptance ?? null);
          setSignedNdaUrl(data.signedNdaUrl ?? "");
          setAccessGranted(true);
          setSuccess(ndaAcceptSuccessMessage);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to accept NDA.");
        }
      });
    };

    const handleUnlockDocument = (password: string) => {
      startTransition(async () => {
        setError("");
        try {
          const res = await fetch(`/api/vaults/${metadata.slug}/bundle`, { method: "GET" });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error || "Unable to fetch document.");
          }
          const encryptedBytes = await res.arrayBuffer();
          const decrypted = await decryptFile({
            encryptedBytes,
            password,
            salt: metadata.salt,
            iv: metadata.iv,
            pbkdf2Iterations: metadata.pbkdf2Iterations,
          });
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          const blob = new Blob([decrypted], { type: metadata.mimeType });
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
          setDownloadName(metadata.fileName);
          setSuccess("Document decrypted locally. Review it below or download it.");

          // Log decrypt event
          void fetch(`/api/vaults/${metadata.slug}/view`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fileCount: 1 }),
          }).catch(() => {});
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to unlock document.");
        }
      });
    };

    const handleReturnEmailSubmit = (email: string) => {
      startTransition(async () => {
        setError("");
        try {
          const res = await fetch("/api/recipient/login-code", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, slug: metadata.slug }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error || "Unable to send access code.");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to send access code.");
        }
      });
    };

    const handleReturnVerify = (code: string, email: string) => {
      startTransition(async () => {
        setError("");
        try {
          const res = await fetch("/api/recipient/verify-code", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, code, slug: metadata.slug }),
          });
          const data = (await res.json()) as AccessResponse;
          if (!res.ok) throw new Error(data.error || "Invalid access code.");
          if (data.pendingEmail) {
            setSuccess("Code verified — please complete the NDA to access the room.");
            return;
          }
          setAccessGranted(true);
          setSuccess("Access granted. Welcome back.");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Invalid access code.");
        }
      });
    };

    return (
      <MobileShareViewer
        hasDocument={hasDocument}
        viewerWatermarkLabel={viewerWatermarkLabel}
        metadata={metadata}
        initialAcceptance={initialAcceptance}
        initialAccessGranted={accessGranted}
        ndaCardTitle={ndaCardTitle}
        ndaCardDescription={ndaCardDescription}
        ndaDocumentText={ndaDocumentText}
        ndaPostPath={ndaPostPath}
        needsBootstrapFromWorkspace={needsBootstrapFromWorkspace}
        isPending={isPending}
        externalError={error}
        externalSuccess={success}
        onSignNda={handleSignNda}
        onUnlockDocument={handleUnlockDocument}
        onReturnEmailSubmit={handleReturnEmailSubmit}
        onReturnVerify={handleReturnVerify}
        onDismissError={() => setError("")}
        objectUrl={objectUrl}
        signingInProgress={isPending}
      />
    );
  }

  // ── Desktop ────────────────────────────────────────────────────
  const ndaStepComplete = !metadata.requiresNda || accessGranted;

  const handleSign = () => {
    startTransition(async () => {
      setError("");
      try {
        const res = await fetch(ndaPostPath, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signerName: ndaDraft.signerName,
            signerEmail: ndaDraft.signerEmail,
            signerCompany: ndaDraft.signerCompany,
            signerAddress: ndaDraft.signerAddress,
            signatureName: ndaDraft.signatureName,
            signatureImage,
            rememberMe,
            viewerBinding: getOrCreateViewerBinding(metadata.slug),
          }),
        });
        const data = (await res.json()) as AccessResponse & {
          savedAccess?: boolean;
          savedAccessMessage?: string;
        };
        if (!res.ok) throw new Error(data.error || "Unable to accept NDA.");
        setAcceptance(data.acceptance ?? null);
        setSignedNdaUrl(data.signedNdaUrl ?? "");
        setAccessGranted(true);
        setSuccess(
          data.savedAccess
            ? `${ndaAcceptSuccessMessage} ${data.savedAccessMessage ?? ""}`
            : ndaAcceptSuccessMessage,
        );
        if (data.savedAccess && data.savedAccessMessage) {
          setSavedAccessMessage(data.savedAccessMessage);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to accept NDA.");
      }
    });
  };

  const handleUnlock = (password: string) => {
    startTransition(async () => {
      setError("");
      try {
        // Revoke previous blob URLs
        for (const { objectUrl: u } of Object.values(decryptedFiles)) {
          URL.revokeObjectURL(u);
        }
        setDecryptedFiles({});

        // Fetch all encrypted files in parallel
        const files = filesList.length ? filesList : [{ id: "legacy-primary", name: metadata.fileName, mimeType: metadata.mimeType, sizeBytes: metadata.fileSize }];

        const results = await Promise.allSettled(
          files.map(async (file) => {
            const params = new URLSearchParams({ fileId: file.id });
            const res = await fetch(`/api/vaults/${metadata.slug}/bundle?${params}`, { method: "GET" });
            if (!res.ok) throw new Error(`Unable to fetch ${file.name}.`);
            const encryptedBytes = await res.arrayBuffer();

            // Use per-file encryption params (vaultFiles) or fall back to legacy metadata fields
            const fileEntry = filesList.find((f) => f.id === file.id);
            const salt = fileEntry ? metadata.vaultFiles?.find((vf) => vf.id === file.id)?.salt ?? metadata.salt : metadata.salt;
            const iv = fileEntry ? metadata.vaultFiles?.find((vf) => vf.id === file.id)?.iv ?? metadata.iv : metadata.iv;
            const pbkdf2Iterations = fileEntry ? metadata.vaultFiles?.find((vf) => vf.id === file.id)?.pbkdf2Iterations ?? metadata.pbkdf2Iterations : metadata.pbkdf2Iterations;

            const decrypted = await decryptFile({
              encryptedBytes,
              password,
              salt,
              iv,
              pbkdf2Iterations,
            });
            const blob = new Blob([decrypted], { type: file.mimeType });
            const url = URL.createObjectURL(blob);
            return { id: file.id, objectUrl: url, downloadName: file.name, mimeType: file.mimeType };
          }),
        );

        const newDecryptedFiles: typeof decryptedFiles = {};
        let hasError = false;
        for (const result of results) {
          if (result.status === "fulfilled") {
            newDecryptedFiles[result.value.id] = {
              objectUrl: result.value.objectUrl,
              downloadName: result.value.downloadName,
            };
          } else {
            hasError = true;
          }
        }

        if (!Object.keys(newDecryptedFiles).length) {
          throw new Error("Unable to decrypt any files. Check your password.");
        }

        setDecryptedFiles(newDecryptedFiles);

        // Show grid view (don't auto-zoom into first file)
        setObjectUrl(null);

        // Save password so files auto-decrypt on refresh
        try {
          sessionStorage.setItem(`tkn_share_pw_${metadata.slug}`, password);
        } catch {
          // sessionStorage may be unavailable in some contexts
        }

        // Log decrypt event
        void fetch(`/api/vaults/${metadata.slug}/view`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileCount: Object.keys(newDecryptedFiles).length }),
        }).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to unlock.");
      }
    });
  };

  const stepNumber = (n: number, done: boolean) => (
    <div
      className={
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
        (done
          ? "bg-foreground text-background"
          : "border-2 border-border text-muted-foreground")
      }
    >
      {done ? <CheckCircle2 className="size-4" /> : n}
    </div>
  );

  const previewable =
    hasDocument &&
    (metadata.mimeType.startsWith("image/") ||
      metadata.mimeType === "application/pdf" ||
      metadata.mimeType.startsWith("text/"));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <ShareRecipientCompactHeader
        shareHostLabel={shareHostLabel}
        workspaceLogoUrl={workspaceLogoUrl}
        workspaceCompanyName={workspaceCompanyName}
        roomTitle={metadata.title}
      />

      {/* Room info — only shown after access is granted */}
      {accessGranted ? (
        <>
          <div className="flex flex-wrap items-center gap-3 border-y border-border py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
              <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {hasDocument ? metadata.fileName : "No document yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasDocument
                  ? `${formatBytes(metadata.fileSize)} · ${formatMimeLabel(metadata.mimeType)}`
                  : "The sender has not uploaded a file. Check back later."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge variant={objectUrl ? "secondary" : "outline"} className="gap-1.5 font-normal">
                {!hasDocument ? (
                  <><Clock className="size-3" /> Waiting</>
                ) : objectUrl ? (
                  <><CheckCircle2 className="size-3" /> Unlocked</>
                ) : (
                  <><Lock className="size-3" /> Encrypted</>
                )}
              </Badge>
              {objectUrl && hasDocument ? (
                <Button asChild variant="outline" size="sm">
                  <a href={objectUrl} download={downloadName}>
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              Expires {formatDateTime(metadata.expiresAt)}
            </span>
            <span>
              Shared by {metadata.senderName}
              {metadata.senderCompany ? ` · ${metadata.senderCompany}` : ""}
            </span>
            {metadata.message ? (
              <span className="basis-full text-[13px] leading-relaxed text-foreground">
                Note: {metadata.message}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        /* Pre-access: don't reveal file details. Show a locked state. */
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {filesList.length > 0
                ? `${filesList.length} encrypted file${filesList.length !== 1 ? "s" : ""}`
                : "Encrypted room"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {metadata.requiresNda
                ? "Sign the confidentiality agreement below to access this room."
                : "Enter the room password to decrypt and view files."}
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {needsBootstrapFromWorkspace ? (
        <Alert>
          <ShieldCheck />
          <AlertTitle>Applying workspace access</AlertTitle>
          <AlertDescription>
            You already signed this workspace&apos;s NDA. Linking it to this room…
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success && !Object.keys(decryptedFiles).length ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {/* Return-visit email gate — hidden once pendingEmail switches to NDA flow */}
      {!accessGranted && showReturnGate ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Access this room</CardTitle>
                <CardDescription>
                  Enter the email you used when signing the NDA. We&apos;ll send you a one-time code.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {returnStep === "email" ? (
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="return-email">Work email</FieldLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="return-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="pl-10"
                      value={returnEmail}
                      onChange={(e) => setReturnEmail(e.target.value)}
                      placeholder="jane@company.com"
                    />
                  </div>
                </Field>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={
                    isPending ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(returnEmail.trim())
                  }
                  onClick={() => {
                    startTransition(async () => {
                      setError("");
                      try {
                        const res = await fetch("/api/recipient/login-code", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ email: returnEmail.trim(), slug: metadata.slug }),
                        });
                        const data = (await res.json()) as { error?: string };
                        if (!res.ok) throw new Error(data.error || "Unable to send code.");
                        setReturnStep("code");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Unable to send code.");
                      }
                    });
                  }}
                >
                  {isPending ? "Sending…" : "Send access code"}
                </Button>
              </FieldGroup>
            ) : (
              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel>Access code</FieldLabel>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Check your inbox at <span className="font-medium text-foreground">{returnEmail}</span>.
                  </p>
                  <p className="mb-3 text-[0.75rem] text-muted-foreground/70">
                    Didn&apos;t receive it? Check your spam folder, or try resending after 30 seconds.
                  </p>
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    value={returnCode}
                    onChange={(v) => setReturnCode(v.replace(/\D/g, "").slice(0, 6))}
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup className="gap-2 border-0 bg-transparent">
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-11 rounded-xl border border-border bg-white text-base font-semibold first:rounded-xl first:border last:rounded-xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="lg"
                    disabled={isPending || returnCode.length !== 6}
                    onClick={() => {
                      startTransition(async () => {
                        setError("");
                        try {
                          const res = await fetch("/api/recipient/verify-code", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ email: returnEmail.trim(), code: returnCode, slug: metadata.slug }),
                          });
                          const data = (await res.json()) as {
                            error?: string;
                            success?: boolean;
                            accessGranted?: boolean;
                            hasAcceptedNda?: boolean;
                            pendingEmail?: string;
                            signerName?: string;
                          };
                          if (!res.ok) throw new Error(data.error || "Code expired or incorrect.");
                          if (data.accessGranted && data.hasAcceptedNda) {
                            setAccessGranted(true);
                            if (data.signerName) {
                              setSuccess(`Welcome back — access granted for ${data.signerName}.`);
                            }
                          } else if (data.pendingEmail) {
                            // No NDA signed yet — pre-fill the identity step email
                            setNdaDraft((d) => ({ ...d, signerEmail: data.pendingEmail ?? returnEmail }));
                            setNdaStep("identity");
                            setReturnStep("email");
                            setReturnCode("");
                            setShowReturnGate(false);
                          }
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Code expired or incorrect.");
                        }
                      });
                    }}
                  >
                    {isPending ? "Verifying…" : "Verify and access"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setReturnStep("email");
                      setReturnCode("");
                    }}
                  >
                    Change email
                  </Button>
                </div>
              </FieldGroup>
            )}

            {metadata.requiresNda ? (
              <p className="text-xs text-muted-foreground">
                Haven&apos;t signed the NDA yet?{" "}
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => {
                    setNdaDraft((d) => ({ ...d, signerEmail: returnEmail }));
                    setNdaStep("identity");
                    setShowReturnGate(false);
                  }}
                >
                  Sign the NDA first
                </button>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 1: NDA — hidden when the return-visit gate is showing (returning users verify email first) */}
      {metadata.requiresNda && !showReturnGate ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              {stepNumber(1, ndaStepComplete)}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{ndaCardTitle}</CardTitle>
                <CardDescription>{ndaCardDescription}</CardDescription>
              </div>
            </div>
            {acceptance ? (
              <CardAction>
                <Badge variant="secondary">Signed {formatDateTime(acceptance.acceptedAt)}</Badge>
              </CardAction>
            ) : null}
          </CardHeader>

          {!accessGranted ? (
            <CardContent className="space-y-6">
              {ndaStep === "identity" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">Step 1 of 3 — Your details</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter how you&apos;ll appear on the confidentiality agreement and access record.
                    </p>
                  </div>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signer-name">Full name</FieldLabel>
                        <Input
                          id="signer-name"
                          autoComplete="name"
                          value={ndaDraft.signerName}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerName: e.target.value }))
                          }
                          placeholder="Jane Doe"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signer-email">Work email</FieldLabel>
                        <Input
                          id="signer-email"
                          type="email"
                          autoComplete="email"
                          value={ndaDraft.signerEmail}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerEmail: e.target.value }))
                          }
                          placeholder="jane@company.com"
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                  {/* Remember me — GDPR-consensual opt-in */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-input"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium text-foreground">Save my email for faster access.</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        We&apos;ll send you a one-time code so you can return without re-signing. Your email is
                        stored securely and only used for room access.
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      disabled={
                        ndaDraft.signerName.trim().length < 2 ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ndaDraft.signerEmail.trim())
                      }
                      onClick={() => setNdaStep("review")}
                    >
                      Continue to review NDA
                    </Button>
                  </div>
                </>
              ) : null}

              {ndaStep === "review" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">Step 2 of 3 — Review</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Read the full agreement, then confirm to proceed to signing.
                    </p>
                  </div>
                  <div
                    className="tkn-prose max-h-[min(22rem,58vh)] min-h-[12rem] overflow-y-auto overscroll-contain rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed text-foreground sm:max-h-96 [-webkit-overflow-scrolling:touch]"
                    tabIndex={0}
                    role="region"
                    aria-label="NDA full text"
                  >
                    {isRichNdaContent(ndaDocumentText) ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(ndaDocumentText) }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{ndaDocumentText}</div>
                    )}
                  </div>
                  <label htmlFor="nda-agree" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <input
                      id="nda-agree"
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded border-input"
                      checked={ndaReadConfirmed}
                      onChange={(e) => setNdaReadConfirmed(e.target.checked)}
                    />
                    <span>I have read this agreement and agree to continue to sign.</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={() => setNdaStep("identity")}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={!ndaReadConfirmed}
                      onClick={() => setNdaStep("sign")}
                    >
                      Continue to sign
                    </Button>
                  </div>
                </>
              ) : null}

              {ndaStep === "sign" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">Step 3 of 3 — Sign</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Complete your address and signature to accept the NDA and unlock the document
                      (after password).
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{ndaDraft.signerName}</span>
                    <span className="mx-2">·</span>
                    {ndaDraft.signerEmail}
                  </div>
                  <FieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signer-company">Company</FieldLabel>
                        <Input
                          id="signer-company"
                          value={ndaDraft.signerCompany}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerCompany: e.target.value }))
                          }
                          placeholder="Northlight Labs"
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="signer-address">Address</FieldLabel>
                        <Textarea
                          id="signer-address"
                          className="min-h-20"
                          value={ndaDraft.signerAddress}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerAddress: e.target.value }))
                          }
                          placeholder="123 Main St, City, State, Zip"
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                  <Separator />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <FieldLabel className="mb-2 block">Your signature</FieldLabel>
                      <SignatureCanvas
                        value={ndaDraft.signatureName}
                        imageValue={signatureImage}
                        onChange={(text) =>
                          setNdaDraft((d) => ({ ...d, signatureName: text }))
                        }
                        onImageChange={(img) => setSignatureImage(img)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setNdaStep("review");
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          isPending ||
                          !ndaDraft.signatureName ||
                          !ndaDraft.signerAddress ||
                          ndaDraft.signerAddress.trim().length < 10
                        }
                        onClick={handleSign}
                        className="w-full sm:w-auto"
                      >
                        <ShieldCheck className="size-4" />
                        Sign and continue
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          ) : acceptance ? (
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="min-w-0 text-sm leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">{acceptance.signerName}</span>
                  <span className="text-muted-foreground"> · {acceptance.signerEmail}</span>
                  {acceptance.signerCompany ? (
                    <span className="text-muted-foreground"> · {acceptance.signerCompany}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDateTime(acceptance.acceptedAt)}
                  </span>
                </p>
                {signedNdaUrl ? (
                  <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
                    <a href={signedNdaUrl}>
                      <Download className="size-4" />
                      Download copy
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {/* Step 2: Unlock card — only after access granted (or no NDA) and no files decrypted yet */}
      {(accessGranted || !metadata.requiresNda) && !showReturnGate && Object.keys(decryptedFiles).length === 0 ? (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Lock className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Decrypt files</CardTitle>
              <CardDescription>
                {hasDocument
                  ? "The sender shared a room password with you. Enter it below to decrypt the files in your browser — nothing is sent to the server."
                  : "The sender still needs to upload files. You'll be able to decrypt once they're added."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {metadata.status !== "active" ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Room inactive</AlertTitle>
              <AlertDescription>
                This room is no longer active. Contact the sender if you still need access.
              </AlertDescription>
            </Alert>
          ) : !hasDocument ? (
            <Alert>
              <Clock />
              <AlertTitle>Document not ready</AlertTitle>
              <AlertDescription>
                This room is set up, but there is no encrypted file yet. Ask the sender to upload
                from their management link, then refresh this page.
              </AlertDescription>
            </Alert>
          ) : (
            /* Password + Unlock — hidden once files are decrypted */
            Object.keys(decryptedFiles).length === 0 && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    id="document-password"
                    placeholder={
                      ndaStepComplete ? "Enter password" : "Complete the NDA first"
                    }
                    type="password"
                    onChange={(e) => {
                      if (e.target.value === "" && objectUrl) {
                        setObjectUrl(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        ndaStepComplete &&
                        (e.target as HTMLInputElement).value
                      ) {
                        handleUnlock((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  disabled={isPending || !ndaStepComplete}
                  aria-busy={isPending}
                  onClick={() => {
                    const pw = (
                      document.getElementById("document-password") as HTMLInputElement
                    )?.value;
                    if (pw) handleUnlock(pw);
                  }}
                >
                  <Lock className="size-4" />
                  {isPending ? "Decrypting…" : "Unlock"}
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
      ) : null}

      {/* Decrypted file grid — shown directly after NDA sign, no unlock card */}
      {Object.keys(decryptedFiles).length > 0 ? (
        <div>
          {/* Preview area — shown when a file is selected */}
          {objectUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-foreground">{downloadName}</p>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <a href={objectUrl} download={downloadName}>
                      <Download className="size-4" />
                      Download
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setObjectUrl(null)}
                  >
                    <ChevronLeft className="size-4" />
                    All files
                  </Button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border bg-muted/20">
                <ViewerWatermarkOverlay label={viewerWatermarkLabel} variant="dark" />
                {(() => {
                  const activeFile = Object.entries(decryptedFiles).find(([, v]) => v.objectUrl === objectUrl);
                  const fileEntry = activeFile
                    ? filesList.find((f) => f.id === activeFile[0]) ?? {
                        id: activeFile[0],
                        name: activeFile[1].downloadName,
                        mimeType: metadata.mimeType,
                        sizeBytes: metadata.fileSize,
                      }
                    : { id: "", name: downloadName, mimeType: metadata.mimeType, sizeBytes: metadata.fileSize };
                  if (fileEntry.mimeType.startsWith("image/")) {
                    return (
                      <Image
                        src={objectUrl}
                        alt={downloadName}
                        width={1600}
                        height={1200}
                        unoptimized
                        className="relative z-0 h-auto w-full"
                      />
                    );
                  }
                  if (fileEntry.mimeType === "application/pdf") {
                    return (
                      <iframe
                        title={downloadName}
                        src={objectUrl}
                        className="relative z-0 h-[65vh] min-h-[24rem] w-full"
                      />
                    );
                  }
                  return (
                    <iframe
                      title={downloadName}
                      src={objectUrl}
                      className="relative z-0 h-[65vh] min-h-[24rem] w-full"
                    />
                  );
                })()}
              </div>
            </div>
          ) : (
            /* File grid — grouped by category when categories exist */
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                {Object.keys(decryptedFiles).length} file{Object.keys(decryptedFiles).length !== 1 ? "s" : ""}{" "}
                decrypted — click to preview or download
              </p>
              {(() => {
                const decryptedEntries = Object.entries(decryptedFiles);
                const hasCategories = filesList.some((f) => f.category);

                const renderFileCard = ([fileId, { objectUrl: url, downloadName: fname }]: [string, { objectUrl: string; downloadName: string }]) => {
                  const fileEntry = filesList.find((f) => f.id === fileId) ?? {
                    id: fileId,
                    name: fname,
                    mimeType: metadata.mimeType,
                    sizeBytes: metadata.fileSize,
                  };
                  const previewable =
                    fileEntry.mimeType.startsWith("image/") ||
                    fileEntry.mimeType === "application/pdf" ||
                    fileEntry.mimeType.startsWith("text/");
                  return (
                    <button
                      key={fileId}
                      type="button"
                      onClick={() => {
                        if (previewable) {
                          setObjectUrl(url);
                          setDownloadName(fname);
                        } else {
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = fname;
                          a.click();
                        }
                      }}
                      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-3 text-left transition-all hover:border-[var(--color-accent)] hover:shadow-sm active:scale-[0.98]"
                    >
                      <div className="flex h-16 w-full items-center justify-center rounded-lg bg-muted/50">
                        {fileEntry.mimeType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={fname}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : fileEntry.mimeType === "application/pdf" ? (
                          <FileText className="size-8 text-red-400" strokeWidth={1.5} />
                        ) : (
                          <FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="w-full min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{fname}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatBytes(fileEntry.sizeBytes)}
                        </p>
                      </div>
                      <div className="mt-auto w-full">
                        {previewable ? (
                          <span className="text-xs font-medium text-[var(--color-accent)]">Preview →</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Click to download</span>
                        )}
                      </div>
                    </button>
                  );
                };

                if (!hasCategories) {
                  return (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {decryptedEntries.map(renderFileCard)}
                    </div>
                  );
                }

                const categoryMap = new Map<string, [string, { objectUrl: string; downloadName: string }][]>();
                const uncategorized: [string, { objectUrl: string; downloadName: string }][] = [];
                for (const entry of decryptedEntries) {
                  const fileEntry = filesList.find((f) => f.id === entry[0]);
                  const cat = fileEntry?.category;
                  if (cat) {
                    const list = categoryMap.get(cat) ?? [];
                    list.push(entry);
                    categoryMap.set(cat, list);
                  } else {
                    uncategorized.push(entry);
                  }
                }

                return (
                  <div className="space-y-4">
                    {Array.from(categoryMap.entries()).map(([cat, entries]) => (
                      <div key={cat}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat}
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {entries.map(renderFileCard)}
                        </div>
                      </div>
                    ))}
                    {uncategorized.length > 0 && (
                      <div>
                        {categoryMap.size > 0 && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Other files
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {uncategorized.map(renderFileCard)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className="text-center text-xs text-muted-foreground">
                Previews are watermarked. Downloads are the original decrypted document.
              </p>
            </div>
          )}
        </div>
      ) : null}

      <p className="mx-auto max-w-xl text-center text-[11px] leading-relaxed text-muted-foreground">
        {SHARE_RECIPIENT_DISCLAIMER}
      </p>
    </div>
  );
}
