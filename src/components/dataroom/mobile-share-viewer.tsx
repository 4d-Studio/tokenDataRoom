"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  Maximize2,
  Minimize2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { ViewerWatermarkOverlay } from "@/components/dataroom/viewer-watermark-overlay";
import { isRichNdaContent } from "@/components/dataroom/rich-text-editor";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import { sanitizeHtml } from "@/lib/dataroom/sanitize";
import {
  recipientVisibleVaultFiles,
  type VaultAcceptanceRecord,
  type VaultRecord,
} from "@/lib/dataroom/types";

type Props = {
  hasDocument: boolean;
  /** Public room banner; shown before unlock. */
  shareBannerSrc?: string;
  /** Shown over in-app preview only (not burned into downloads). */
  viewerWatermarkLabel?: string;
  metadata: VaultRecord;
  initialAcceptance: VaultAcceptanceRecord | null;
  initialAccessGranted: boolean;
  ndaCardTitle: string;
  ndaCardDescription?: ReactNode;
  ndaDocumentText: string;
  ndaPostPath: string;
  needsBootstrapFromWorkspace: boolean;
  isPending: boolean;
  externalError: string;
  externalSuccess: string;
  onSignNda: (fields: {
    signerName: string;
    signerEmail: string;
    signerCompany: string;
    signerAddress: string;
    signatureName: string;
    signatureImage?: string;
    rememberMe?: boolean;
  }) => void;
  signingInProgress?: boolean;
  onUnlockDocument: (password: string) => void;
  onReturnEmailSubmit: (email: string) => void;
  onReturnVerify: (code: string, email: string) => void;
  onDismissError: () => void;
  objectUrl: string | null;
  decryptedFiles?: Record<string, { objectUrl: string; downloadName: string }>;
  activeFileName?: string;
  onDecryptedPreviewChange?: (objectUrl: string, downloadName: string) => void;
};

export function MobileShareViewer({
  hasDocument,
  shareBannerSrc,
  viewerWatermarkLabel = "",
  metadata,
  initialAcceptance,
  initialAccessGranted,
  ndaCardTitle,
  ndaCardDescription,
  ndaDocumentText,
  ndaPostPath,
  needsBootstrapFromWorkspace,
  isPending,
  externalError,
  externalSuccess,
  onSignNda,
  onUnlockDocument,
  onReturnEmailSubmit,
  onReturnVerify,
  onDismissError,
  objectUrl,
  decryptedFiles = {},
  activeFileName,
  onDecryptedPreviewChange,
  signingInProgress = false,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signerName, setSignerName] = useState(initialAcceptance?.signerName ?? "");
  const [signerEmail, setSignerEmail] = useState(initialAcceptance?.signerEmail ?? "");
  const [signerCompany, setSignerCompany] = useState(initialAcceptance?.signerCompany ?? "");
  const [signerAddress, setSignerAddress] = useState(initialAcceptance?.signerAddress ?? "");
  const [signatureName, setSignatureName] = useState(initialAcceptance?.signatureName ?? "");
  const [signatureImage, setSignatureImage] = useState<string | undefined>(
    initialAcceptance?.signatureImage,
  );
  const [decrypted, setDecrypted] = useState(false);
  const [localError, setLocalError] = useState("");
  const [ndaSheetStep, setNdaSheetStep] = useState<1 | 2 | 3>(1);
  const [ndaReviewChecked, setNdaReviewChecked] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Return-visit gate
  const [returnStep, setReturnStep] = useState<"email" | "code">("email");
  const [returnEmail, setReturnEmail] = useState("");
  const [returnCode, setReturnCode] = useState("");

  const isNdaDone = !metadata.requiresNda || initialAccessGranted;
  const manifest = recipientVisibleVaultFiles(metadata);
  const headFile = manifest[0];
  const activeFileMeta = useMemo(() => {
    if (!objectUrl || !Object.keys(decryptedFiles).length) return headFile;
    return manifest.find((f) => decryptedFiles[f.id]?.objectUrl === objectUrl) ?? headFile;
  }, [objectUrl, decryptedFiles, manifest, headFile]);

  const imageSlides = useMemo(() => {
    return manifest
      .filter((f) => f.mimeType.startsWith("image/") && decryptedFiles[f.id])
      .map((f) => ({
        src: decryptedFiles[f.id].objectUrl,
        fileName: decryptedFiles[f.id].downloadName,
      }));
  }, [manifest, decryptedFiles]);

  const previewable =
    hasDocument &&
    Boolean(
      (decrypted && activeFileMeta
        ? activeFileMeta.mimeType.startsWith("image/") ||
          activeFileMeta.mimeType === "application/pdf" ||
          activeFileMeta.mimeType.startsWith("text/")
        : headFile &&
          (headFile.mimeType.startsWith("image/") ||
            headFile.mimeType === "application/pdf" ||
            headFile.mimeType.startsWith("text/"))),
    );

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setLocalError("");
    onDismissError();
    onUnlockDocument(password);
    setDecrypted(true);
    setSheetOpen(false);
  }, [password, onUnlockDocument, onDismissError]);

  const handleSign = useCallback(() => {
    const typed = signatureName.trim();
    const hasSig = Boolean(signatureImage) || typed.length >= 2;
    if (!hasSig || !signerName || !signerEmail || !signerAddress) return;
    if (signerAddress.trim().length < 10) return;
    setLocalError("");
    onDismissError();
    const signatureNameForApi = signatureImage ? typed || signerName.trim() : typed;
    onSignNda({
      signerName,
      signerEmail,
      signerCompany,
      signerAddress,
      signatureName: signatureNameForApi,
      signatureImage,
      rememberMe,
    });
    // Don't close the sheet here — parent signals completion via signingInProgress=false + initialAccessGranted=true
  }, [
    signatureName,
    signatureImage,
    signerName,
    signerEmail,
    signerAddress,
    signerCompany,
    onSignNda,
    onDismissError,
    rememberMe,
  ]);

  // Close sheet once the parent confirms access granted (NDA signed successfully)
  useEffect(() => {
    if (initialAccessGranted) {
      setSheetOpen(false);
    }
  }, [initialAccessGranted]);

  const displayError = localError || externalError;

  return (
    <div className="fixed inset-0 flex flex-col bg-background pt-[env(safe-area-inset-top,0px)]">
      {/* ── Top bar (recipient: product light shell, not theater-dark) ── */}
      <div className="relative z-10 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pb-0 shadow-sm">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {decrypted && activeFileName
                ? activeFileName
                : isNdaDone && hasDocument && headFile
                  ? headFile.name
                  : "Locked"}
            </p>
            <p className="text-xs text-muted-foreground">
              {decrypted && activeFileMeta
                ? formatBytes(activeFileMeta.sizeBytes)
                : isNdaDone && hasDocument && headFile
                  ? formatBytes(headFile.sizeBytes)
                  : "Encrypted"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {decrypted ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-3" />
              Unlocked
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="size-3" />
              Encrypted
            </span>
          )}
        </div>
      </div>

      {/* ── Document viewport — welcome + blurred room until decrypted ── */}
      <div className="relative flex-1 overflow-hidden">
        {decrypted && hasDocument ? (
          <MobileDocumentView
            src={objectUrl}
            mimeType={activeFileMeta?.mimeType ?? metadata.mimeType}
            fileName={activeFileMeta?.name ?? metadata.fileName}
            previewable={previewable}
            watermarkLabel={viewerWatermarkLabel}
            imageGallery={
              imageSlides.length > 1 && onDecryptedPreviewChange
                ? {
                    slides: imageSlides,
                    onNavigate: (i: number) => {
                      const s = imageSlides[i];
                      if (s) onDecryptedPreviewChange(s.src, s.fileName);
                    },
                  }
                : undefined
            }
          />
        ) : decrypted ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Clock className="size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No file in this room yet</p>
            <p className="text-xs text-muted-foreground">
              The room is unlocked but there&apos;s nothing to preview. Ask the sender to upload from
              owner controls.
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <FileText className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            {shareBannerSrc ? (
              <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shareBannerSrc}
                  alt=""
                  className="max-h-40 w-full object-cover"
                />
              </div>
            ) : null}
            <p className="text-base font-semibold text-foreground">{metadata.title}</p>
            <p className="text-sm text-muted-foreground">
              {hasDocument && headFile ? headFile.name : "No file uploaded yet"}
            </p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-2 rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-medium text-foreground shadow-sm"
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {/* ── Draggable bottom sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120) setSheetOpen(false);
            }}
            className="relative z-20 flex flex-col rounded-t-3xl bg-white"
            style={{ maxHeight: "92vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-9 rounded-full bg-neutral-200" />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-safe">
              {/* Error / success */}
              {displayError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <XCircle className="size-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-600">{displayError}</p>
                </div>
              ) : externalSuccess ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <p className="text-sm text-emerald-700">{externalSuccess}</p>
                </div>
              ) : null}

              {/* Return-visit gate — only if they have a prior acceptance record */}
              {!initialAccessGranted && metadata.requiresNda && initialAcceptance ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                      <Mail className="size-4 text-[var(--color-accent)]" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Welcome back</span>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-neutral-600">
                    If you previously signed the agreement, enter your email to get a quick access code.
                  </p>
                  {returnStep === "email" ? (
                    <div className="space-y-2.5">
                      <Input
                        value={returnEmail}
                        onChange={(e) => setReturnEmail(e.target.value)}
                        placeholder="Your email"
                        type="email"
                        className="h-9 text-sm"
                      />
                      <Button
                        type="button"
                        className="w-full"
                        aria-busy={isPending}
                        disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(returnEmail.trim()) || isPending}
                        onClick={() => {
                          setLocalError("");
                          onDismissError();
                          onReturnEmailSubmit(returnEmail.trim());
                          setReturnStep("code");
                        }}
                      >
                        {isPending ? "Sending…" : "Send access code"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-neutral-500">Enter the code sent to {returnEmail}</p>
                      <p className="text-[0.7rem] text-neutral-400">
                        Didn&apos;t receive it? Check your spam folder, or try resending after 30 seconds.
                      </p>
                      <InputOTP
                        value={returnCode}
                        onChange={setReturnCode}
                        maxLength={6}
                        className="justify-center"
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} className="size-10 text-base" />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setReturnStep("email");
                            setReturnCode("");
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          aria-busy={isPending}
                          disabled={returnCode.length < 6 || isPending}
                          onClick={() => {
                            setLocalError("");
                            onDismissError();
                            onReturnVerify(returnCode, returnEmail);
                          }}
                        >
                          {isPending ? "Verifying…" : "Verify"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* NDA card — first-time signers only (no prior acceptance) */}
              {metadata.requiresNda && !initialAccessGranted && !initialAcceptance && (
                <div className="space-y-3">
                  {ndaSheetStep === 1 ? (
                    <div className="space-y-3">
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Full name"
                        className="h-10 text-sm"
                      />
                      <Input
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        placeholder="Work email"
                        type="email"
                        className="h-10 text-sm"
                      />
                      <Button
                        type="button"
                        className="w-full"
                        disabled={
                          signerName.trim().length < 2 ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail.trim())
                        }
                        onClick={() => setNdaSheetStep(2)}
                      >
                        Continue
                      </Button>
                    </div>
                  ) : null}

                  {ndaSheetStep === 2 ? (
                    <div className="space-y-3">
                      <div
                        className="min-h-[min(42vh,16rem)] max-h-[min(62vh,26rem)] touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-700 [-webkit-overflow-scrolling:touch]"
                        tabIndex={0}
                        role="region"
                        aria-label="NDA full text"
                      >
                        {isRichNdaContent(ndaDocumentText) ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(ndaDocumentText) }} />
                        ) : (
                          <p className="whitespace-pre-wrap">{ndaDocumentText}</p>
                        )}
                      </div>
                      <label htmlFor="nda-review-agree" className="flex cursor-pointer items-start gap-2 text-xs text-neutral-700">
                        <input
                          id="nda-review-agree"
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
                          checked={ndaReviewChecked}
                          onChange={(e) => setNdaReviewChecked(e.target.checked)}
                        />
                        <span>I have read and agree to the above.</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Save my email for faster access next time.</span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setNdaSheetStep(1)}
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          disabled={!ndaReviewChecked}
                          onClick={() => setNdaSheetStep(3)}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {ndaSheetStep === 3 ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-neutral-500">Step 3 of 3 — Address and signature.</p>
                      <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600">
                        <span className="font-medium text-neutral-900">{signerName}</span>
                        <span className="mx-1">·</span>
                        {signerEmail}
                      </div>
                      <Input
                        value={signerCompany}
                        onChange={(e) => setSignerCompany(e.target.value)}
                        placeholder="Company (optional)"
                        className="h-9 text-sm"
                      />
                      <Textarea
                        value={signerAddress}
                        onChange={(e) => setSignerAddress(e.target.value)}
                        placeholder="Address"
                        rows={2}
                        className="text-sm"
                      />

                      <div className="rounded-lg border border-neutral-200 bg-white p-3">
                        <p className="mb-2 text-xs text-neutral-400">Your electronic signature</p>
                        <SignatureCanvas
                          value={signatureName}
                          imageValue={signatureImage}
                          onChange={(text) => setSignatureName(text)}
                          onImageChange={(img) => setSignatureImage(img)}
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setNdaSheetStep(2)}
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleSign}
                          disabled={
                            signingInProgress ||
                            isPending ||
                            !(signatureImage || signatureName.trim().length >= 2) ||
                            !signerAddress ||
                            signerAddress.trim().length < 10
                          }
                          aria-busy={signingInProgress || isPending}
                          className="flex-1"
                          size="lg"
                        >
                          <ShieldCheck className="size-4" />
                          {signingInProgress || isPending ? "Signing…" : "Sign and continue"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Unlock card */}
              {isNdaDone && !decrypted && !hasDocument && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="size-4 text-amber-700" />
                    <span className="text-sm font-semibold text-amber-950">Document not ready</span>
                  </div>
                  <p className="text-sm text-amber-900/80">
                    The sender hasn&apos;t uploaded a file yet. Refresh after they add one from
                    owner controls.
                  </p>
                </div>
              )}

              {isNdaDone && !decrypted && hasDocument && (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-black/10">
                      <Lock className="size-4 text-black" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Enter password to unlock</span>
                  </div>

                  <div className="relative mb-3">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password from sender"
                      type={showPassword ? "text" : "password"}
                      className="h-11 pr-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && password.length > 0) handleUnlock();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showPassword ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                  </div>

                  <Button
                    onClick={handleUnlock}
                    disabled={isPending || !password}
                    className="w-full"
                    size="lg"
                  >
                    <Lock className="size-4" />
                    Unlock document
                  </Button>
                </div>
              )}

              {/* Done state */}
              {(initialAccessGranted || decrypted) && (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {decrypted ? "Document unlocked" : "NDA signed"}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {decrypted
                        ? "Scroll to view the document below."
                        : hasDocument
                          ? "Enter the password to view the document."
                          : "The sender still needs to upload a file."}
                    </p>
                  </div>
                  {!decrypted && hasDocument ? (
                    <Button
                      variant="outline"
                      onClick={() => setSheetOpen(false)}
                      className="text-sm"
                    >
                      Enter password
                    </Button>
                  ) : null}
                </div>
              )}

              <div className="h-8" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating pill when sheet is closed */}
      <AnimatePresence>
        {!sheetOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSheetOpen(true)}
            aria-label={isNdaDone ? "Open unlock and room options" : "Open NDA and room options"}
            className="absolute left-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-foreground shadow-lg"
            style={{
              bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            {isNdaDone ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}
            <span className="text-sm font-medium text-foreground">
              {isNdaDone ? "Unlock document" : "Sign NDA to continue"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function PdfDeckView({
  src,
  fileName,
  watermarkLabel,
}: {
  src: string;
  fileName: string;
  watermarkLabel?: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.35);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow?.document) return;
      const pdfViewer = iframe.contentWindow.document.querySelector(".pdfViewer");
      if (pdfViewer) {
        const pages = pdfViewer.querySelectorAll(".page");
        setTotalPages(pages.length || 1);
      }
    } catch {
      /* cross-origin, can't read iframe */
    }
  };

  const goPrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(
    () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    [totalPages],
  );
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation — ignore when typing in form fields (global listener)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)
        return;
      if (t instanceof HTMLElement && t.isContentEditable) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goPrev, goNext, toggleFullscreen]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col bg-[#111111]"
      onDoubleClick={() => setShowControls((v) => !v)}
    >
      {/* PDF iframe — page params appended to trigger reload on page change */}
      <div className="relative flex-1 overflow-hidden">
        {watermarkLabel ? (
          <ViewerWatermarkOverlay label={watermarkLabel} variant="light" />
        ) : null}
        {showControls ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="absolute left-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronLeft className="size-7" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="absolute right-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronRight className="size-7" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
        <iframe
          key={`pdf-${currentPage}-${scale}`}
          ref={iframeRef}
          src={`${src}#page=${currentPage}&zoom=${Math.round(scale * 100)}`}
          className="relative z-0 h-full w-full border-0"
          title={fileName}
          onLoad={handleIframeLoad}
        />
      </div>

      {/* ── Bottom nav bar ── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/90 to-transparent pt-12 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
          >
            {/* Page scrubber */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, totalPages)}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  aria-label="PDF page"
                  className="neutraliser h-1 w-full appearance-none rounded-full bg-white/20 accent-white"
                />
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            {/* Page counter + controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">
                {currentPage} / {totalPages}
              </span>

              <div className="flex items-center gap-1">
                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  aria-label="Zoom out"
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  <span className="text-xs font-bold">A−</span>
                </button>
                <span className="w-10 text-center text-xs text-white/50">{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                  aria-label="Zoom in"
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  <span className="text-sm font-bold">A+</span>
                </button>

                <div className="mx-1 h-4 w-px bg-white/20" />

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = src;
                    a.download = fileName;
                    a.click();
                  }}
                  aria-label="Download PDF"
                  className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                >
                  <Download className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap hint */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {!showControls && (
          <p className="text-xs text-white/20">Double-tap to show controls</p>
        )}
      </div>
    </div>
  );
}

function ImageDeckView({
  slides,
  activeIndex,
  onActiveIndexChange,
  watermarkLabel,
}: {
  slides: { src: string; fileName: string }[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  watermarkLabel?: string;
}) {
  const [showControls, setShowControls] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, slides.length - 1));
  const current = slides[safeIndex];
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < slides.length - 1;
  const multi = slides.length > 1;

  return (
    <div
      ref={scrollRef}
      className="relative flex h-full w-full flex-col bg-[#111111]"
      onDoubleClick={() => setShowControls((v) => !v)}
    >
      <div className="relative flex-1 overflow-y-auto">
        {watermarkLabel ? (
          <ViewerWatermarkOverlay label={watermarkLabel} variant="light" />
        ) : null}
        {multi && showControls ? (
          <>
            <button
              type="button"
              onClick={() => onActiveIndexChange(safeIndex - 1)}
              disabled={!canPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronLeft className="size-7" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => onActiveIndexChange(safeIndex + 1)}
              disabled={!canNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronRight className="size-7" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current?.src}
          alt={
            multi
              ? `${current?.fileName ?? "Image"} — ${safeIndex + 1} / ${slides.length}`
              : (current?.fileName ?? "Image")
          }
          className="relative z-0 min-h-full w-full object-contain"
        />
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/90 to-transparent pt-10 pb-5 px-4"
          >
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onActiveIndexChange(Math.max(0, safeIndex - 1))}
                disabled={!canPrev}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="size-6" />
              </button>

              <span className="max-w-[55vw] truncate text-sm font-medium text-white/70">
                {multi ? `${safeIndex + 1} / ${slides.length}` : (current?.fileName ?? "")}
              </span>

              <button
                type="button"
                onClick={() =>
                  onActiveIndexChange(Math.min(slides.length - 1, safeIndex + 1))
                }
                disabled={!canNext}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = current?.src ?? "";
                  a.download = current?.fileName ?? "image";
                  a.click();
                }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white"
              >
                <Download className="size-4" />
                Download
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileDocumentView({
  src,
  mimeType,
  fileName,
  previewable,
  watermarkLabel = "",
  imageGallery,
}: {
  src: string | null;
  mimeType: string;
  fileName: string;
  previewable: boolean;
  watermarkLabel?: string;
  imageGallery?: {
    slides: { src: string; fileName: string }[];
    onNavigate: (index: number) => void;
  };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  if (!previewable || !src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
          <FileText className="size-8 text-white/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">Cannot preview this file type</p>
          <p className="mt-1 text-xs text-white/40">{mimeType}</p>
        </div>
        {src && (
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = src;
              a.download = fileName;
              a.click();
            }}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/20 hover:text-white"
          >
            <Download className="size-4" />
            Download file
          </button>
        )}
      </div>
    );
  }

  if (mimeType === "application/pdf") {
    return (
      <PdfDeckView
        src={src}
        fileName={fileName}
        watermarkLabel={watermarkLabel || undefined}
      />
    );
  }

  if (mimeType.startsWith("image/")) {
    const slides =
      imageGallery?.slides ??
      (src ? [{ src, fileName }] : []);
    const activeIndex = Math.max(
      0,
      slides.findIndex((s) => s.src === src),
    );
    return (
      <ImageDeckView
        slides={slides}
        activeIndex={activeIndex}
        onActiveIndexChange={(i) => {
          imageGallery?.onNavigate(i);
        }}
        watermarkLabel={watermarkLabel || undefined}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
          setScrollPct(Math.min(100, Math.max(0, pct * 100)));
        }}
      >
        {watermarkLabel ? (
          <ViewerWatermarkOverlay label={watermarkLabel} variant="light" />
        ) : null}
        <iframe
          src={src}
          className="relative z-0 h-full w-full border-0"
          title={fileName}
        />
      </div>
      <div className="h-1 w-full bg-white/10">
        <motion.div
          className="h-full bg-white/60"
          style={{ width: `${scrollPct}%` }}
          transition={{ ease: "linear", duration: 0.05 }}
        />
      </div>
    </div>
  );
}
