"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Maximize2,
  Minimize2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { ShareMobileWelcomeLayer } from "@/components/dataroom/share-entry-welcome";
import { ViewerWatermarkOverlay } from "@/components/dataroom/viewer-watermark-overlay";
import { isRichNdaContent } from "@/components/dataroom/rich-text-editor";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/dataroom/types";

type Props = {
  hasDocument: boolean;
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
  }) => void;
  onUnlockDocument: (password: string) => void;
  onDismissError: () => void;
  objectUrl: string | null;
  shareHostLabel?: string;
  workspaceLogoUrl?: string | null;
  workspaceCompanyName?: string | null;
};

export function MobileShareViewer({
  hasDocument,
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
  onDismissError,
  objectUrl,
  shareHostLabel = "",
  workspaceLogoUrl,
  workspaceCompanyName,
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

  const isNdaDone = !metadata.requiresNda || initialAccessGranted;
  const previewable =
    hasDocument &&
    (metadata.mimeType.startsWith("image/") ||
      metadata.mimeType === "application/pdf" ||
      metadata.mimeType.startsWith("text/"));

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setLocalError("");
    onDismissError();
    onUnlockDocument(password);
    setDecrypted(true);
    setSheetOpen(false);
  }, [password, onUnlockDocument, onDismissError]);

  const handleSign = useCallback(() => {
    if (!signatureName || !signerName || !signerEmail || !signerAddress) return;
    setLocalError("");
    onDismissError();
    onSignNda({ signerName, signerEmail, signerCompany, signerAddress, signatureName, signatureImage });
    setSheetOpen(false);
  }, [signatureName, signatureImage, signerName, signerEmail, signerAddress, onSignNda, onDismissError]);

  const displayError = localError || externalError;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a]">
      {/* ── Top bar ── */}
      <div className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
            <FileText className="size-4 text-white/70" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {hasDocument ? metadata.fileName : "No document yet"}
            </p>
            <p className="text-xs text-white/40">
              {hasDocument ? formatBytes(metadata.fileSize) : "Waiting for sender"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {decrypted ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="size-3" />
              Unlocked
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/60">
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
            mimeType={metadata.mimeType}
            fileName={metadata.fileName}
            previewable={previewable}
            watermarkLabel={viewerWatermarkLabel}
          />
        ) : decrypted ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Clock className="size-10 text-white/30" />
            <p className="text-sm font-medium text-white/80">No file in this room yet</p>
            <p className="text-xs text-white/45">
              The room is unlocked but there&apos;s nothing to preview. Ask the sender to upload from
              owner controls.
            </p>
          </div>
        ) : (
          <ShareMobileWelcomeLayer
            shareHostLabel={shareHostLabel}
            workspaceLogoUrl={workspaceLogoUrl}
            workspaceCompanyName={workspaceCompanyName}
            roomTitle={metadata.title}
            hasDocument={hasDocument}
            fileName={metadata.fileName}
            onContinue={() => setSheetOpen(true)}
          />
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
              {/* Room meta */}
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Clock className="size-3.5" />
                Expires {formatDateTime(metadata.expiresAt)}
                <span className="mx-0.5">·</span>
                <span>{metadata.senderName}</span>
              </div>

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

              {/* NDA card */}
              {metadata.requiresNda && !initialAccessGranted && (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                      <ShieldCheck className="size-4 text-[var(--color-accent)]" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{ndaCardTitle}</span>
                  </div>
                  {ndaCardDescription ? (
                    <p className="mb-3 text-xs leading-relaxed text-neutral-600">{ndaCardDescription}</p>
                  ) : null}

                  {ndaSheetStep === 1 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-500">
                        Step 1 of 3 — Your name and work email.
                      </p>
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Full name"
                        className="h-9 text-sm"
                      />
                      <Input
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        placeholder="Work email"
                        type="email"
                        className="h-9 text-sm"
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
                        Continue to review NDA
                      </Button>
                    </div>
                  ) : null}

                  {ndaSheetStep === 2 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-500">Step 2 of 3 — Read the agreement.</p>
                      <div
                        className="min-h-[min(42vh,16rem)] max-h-[min(62vh,26rem)] touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-700 [-webkit-overflow-scrolling:touch]"
                        tabIndex={0}
                        role="region"
                        aria-label="NDA full text"
                      >
                        {isRichNdaContent(ndaDocumentText) ? (
                          <div dangerouslySetInnerHTML={{ __html: ndaDocumentText }} />
                        ) : (
                          <p className="whitespace-pre-wrap">{ndaDocumentText}</p>
                        )}
                      </div>
                      <label className="flex cursor-pointer items-start gap-2 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 rounded border-neutral-300"
                          checked={ndaReviewChecked}
                          onChange={(e) => setNdaReviewChecked(e.target.checked)}
                        />
                        <span>I have read this and agree to continue to sign.</span>
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
                          Continue to sign
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
                            isPending ||
                            !signatureName ||
                            !signerAddress ||
                            signerAddress.trim().length < 10
                          }
                          className="flex-1"
                          size="lg"
                        >
                          <ShieldCheck className="size-4" />
                          Sign and continue
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSheetOpen(true)}
            className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 shadow-xl ring-1 ring-black/10"
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
  const [scale, setScale] = useState(1);
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

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [totalPages]);

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
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/90 to-transparent pt-12 pb-5 px-4"
          >
            {/* Page scrubber */}
            <div className="flex items-center gap-3">
              <button
                onClick={goPrev}
                disabled={currentPage <= 1}
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
                  className="neutraliser h-1 w-full appearance-none rounded-full bg-white/20 accent-white"
                />
              </div>

              <button
                onClick={goNext}
                disabled={currentPage >= totalPages}
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
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  <span className="text-xs font-bold">A−</span>
                </button>
                <span className="w-10 text-center text-xs text-white/50">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  <span className="text-sm font-bold">A+</span>
                </button>

                <div className="mx-1 h-4 w-px bg-white/20" />

                <button
                  onClick={toggleFullscreen}
                  className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>

                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = src;
                    a.download = fileName;
                    a.click();
                  }}
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
  src,
  fileName,
  watermarkLabel,
}: {
  src: string;
  fileName: string;
  watermarkLabel?: string;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);

  // For images, treat each image as a page in a "deck"
  useEffect(() => {
    setImages([src]);
    setCurrentImage(0);
  }, [src]);

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentImage] ?? src}
          alt={`${fileName} — image ${currentImage + 1}`}
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
                onClick={() => setCurrentImage((i) => Math.max(0, i - 1))}
                disabled={currentImage <= 0}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
              </button>

              <span className="text-sm font-medium text-white/70">
                {images.length > 1 ? `${currentImage + 1} / ${images.length}` : fileName}
              </span>

              <button
                onClick={() => setCurrentImage((i) => Math.min(images.length - 1, i + 1))}
                disabled={currentImage >= images.length - 1}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = images[currentImage] ?? src;
                  a.download = fileName;
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
}: {
  src: string | null;
  mimeType: string;
  fileName: string;
  previewable: boolean;
  watermarkLabel?: string;
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
    return (
      <ImageDeckView
        src={src}
        fileName={fileName}
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
