"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { MobileShareViewer } from "@/components/dataroom/mobile-share-viewer";
import { RecipientRecordPanel } from "@/components/dataroom/recipient-record-panel";
import { ShareRecipientAppBar } from "@/components/dataroom/share-recipient-app-bar";
import {
  SHARE_RECIPIENT_DISCLAIMER,
  ShareRecipientCompactHeader,
} from "@/components/dataroom/share-entry-welcome";
import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { DraggableDecryptedFocusFileRail } from "@/components/dataroom/share-draggable-file-rail";
import { SharePreviewViewport } from "@/components/dataroom/share-preview-viewport";
import { ViewerWatermarkOverlay } from "@/components/dataroom/viewer-watermark-overlay";
import { decryptFile } from "@/lib/dataroom/client-crypto";
import { getOrCreateViewerBinding } from "@/lib/dataroom/viewer-binding-client";
import { sanitizeHtml } from "@/lib/dataroom/sanitize";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import { isRichNdaContent } from "@/components/dataroom/rich-text-editor";
import {
  recipientVisibleVaultFiles,
  vaultHasRecipientVisibleDocument,
  type VaultAcceptanceRecord,
  type VaultFileEntry,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ndaFormInputClassName =
  "h-11 rounded-xl border-2 border-foreground/10 bg-card px-3.5 text-sm shadow-[0_2px_8px_rgba(35,31,26,0.06)] transition-[box-shadow,border-color] placeholder:text-foreground/40 focus-visible:border-[color:var(--color-accent)] focus-visible:shadow-[0_0_0_3px_rgba(243,91,45,0.18),0_2px_10px_rgba(35,31,26,0.07)] focus-visible:ring-0";

type AccessResponse = {
  acceptance?: VaultAcceptanceRecord;
  error?: string;
  signedNdaUrl?: string;
  success?: boolean;
  accessGranted?: boolean;
  hasAcceptedNda?: boolean;
  pendingEmail?: string;
  signerName?: string;
};

type NdaFlowStep = "identity" | "review" | "sign";

type NdaFormDraft = {
  signerName: string;
  signerEmail: string;
  signerCompany: string;
  signerAddress: string;
  signatureName: string;
};

function DesktopDecryptedPreviewContent({
  objectUrl,
  downloadName,
  metadata,
  vaultSlug,
  decryptedFiles,
  unlockedManifestFiles,
  orderedImagePreviewEntries,
  viewerWatermarkLabel,
  openDecryptedVaultFile,
  setObjectUrl,
  setDownloadName,
  readingStrip,
}: {
  objectUrl: string;
  downloadName: string;
  metadata: VaultRecord;
  vaultSlug: string;
  decryptedFiles: Record<string, { objectUrl: string; downloadName: string }>;
  unlockedManifestFiles: VaultFileEntry[];
  orderedImagePreviewEntries: { id: string; objectUrl: string; downloadName: string }[];
  viewerWatermarkLabel: string;
  openDecryptedVaultFile: (fileId: string) => void;
  setObjectUrl: (url: string | null) => void;
  setDownloadName: (name: string) => void;
  readingStrip: boolean;
}) {
  const activePair = Object.entries(decryptedFiles).find(([, v]) => v.objectUrl === objectUrl);
  const activeFileId = activePair?.[0] ?? null;
  const manifestActive = activeFileId
    ? unlockedManifestFiles.find((f) => f.id === activeFileId)
    : undefined;
  const fileEntry: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
  } = manifestActive
    ? {
        id: manifestActive.id,
        name: manifestActive.name,
        mimeType: manifestActive.mimeType,
        sizeBytes: manifestActive.sizeBytes,
      }
    : activePair
      ? {
          id: activePair[0],
          name: activePair[1].downloadName,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.fileSize,
        }
      : {
          id: "",
          name: downloadName,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.fileSize,
        };

  const showFocusRail = unlockedManifestFiles.length > 1;
  const useNativeDocViewport =
    fileEntry.mimeType === "application/pdf" || fileEntry.mimeType.startsWith("text/");

  const sidebar = showFocusRail ? (
    <DraggableDecryptedFocusFileRail
      vaultSlug={vaultSlug}
      layout="docked"
      readingStrip={readingStrip}
      files={unlockedManifestFiles}
      activeFileId={activeFileId}
      decryptedFiles={decryptedFiles}
      onPick={openDecryptedVaultFile}
    />
  ) : null;

  const mainChrome = readingStrip
    ? "relative flex min-h-0 min-w-0 flex-1 flex-col"
    : "relative flex min-h-0 min-w-0 flex-1 flex-col p-1 sm:p-2";

  const mainChromePdf = readingStrip
    ? "relative flex min-h-0 min-w-0 flex-1 flex-col"
    : "relative flex min-h-0 min-w-0 flex-1 flex-col";

  if (fileEntry.mimeType.startsWith("image/")) {
    const imgIdx =
      activeFileId != null
        ? orderedImagePreviewEntries.findIndex((e) => e.id === activeFileId)
        : -1;
    const hasImgNav = orderedImagePreviewEntries.length > 1;
    const goPrevImg = () => {
      if (imgIdx <= 0) return;
      const e = orderedImagePreviewEntries[imgIdx - 1];
      setObjectUrl(e.objectUrl);
      setDownloadName(e.downloadName);
    };
    const goNextImg = () => {
      if (imgIdx < 0 || imgIdx >= orderedImagePreviewEntries.length - 1) return;
      const e = orderedImagePreviewEntries[imgIdx + 1];
      setObjectUrl(e.objectUrl);
      setDownloadName(e.downloadName);
    };
    return (
      <>
        {sidebar}
        <div className={mainChrome}>
          <ViewerWatermarkOverlay label={viewerWatermarkLabel} variant="dark" />
          <SharePreviewViewport
            fillHeight
            edgeNavLeft={
              hasImgNav ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-full border border-[color:var(--tkn-panel-border)] shadow-md sm:h-12 sm:w-12"
                  disabled={imgIdx <= 0}
                  onClick={goPrevImg}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              ) : null
            }
            edgeNavRight={
              hasImgNav ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 rounded-full border border-[color:var(--tkn-panel-border)] shadow-md sm:h-12 sm:w-12"
                  disabled={imgIdx < 0 || imgIdx >= orderedImagePreviewEntries.length - 1}
                  onClick={goNextImg}
                  aria-label="Next image"
                >
                  <ChevronRight className="size-5" />
                </Button>
              ) : null
            }
          >
            <div className="flex h-full min-h-0 items-center justify-center py-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URLs */}
              <img
                src={objectUrl}
                alt={downloadName}
                draggable={false}
                className="relative z-0 max-h-full max-w-full select-none object-contain"
              />
            </div>
          </SharePreviewViewport>
        </div>
      </>
    );
  }

  return (
    <>
      {sidebar}
      <div className={mainChromePdf}>
        <ViewerWatermarkOverlay label={viewerWatermarkLabel} variant="dark" />
        <SharePreviewViewport canvasMode={!useNativeDocViewport} fillHeight>
          <iframe
            key={activeFileId ? `doc-${activeFileId}` : `doc-${downloadName}`}
            title={downloadName}
            src={
              fileEntry.mimeType === "application/pdf"
                ? `${objectUrl}#page=1&zoom=page-width`
                : objectUrl
            }
            className="relative z-0 h-full min-h-0 w-full flex-1 border-0 bg-white"
          />
        </SharePreviewViewport>
      </div>
    </>
  );
}

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
  shareExpiresLabel,
  recipientShareUrl,
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
  /** From the server page — avoids client Intl timezone hydration mismatches. */
  shareExpiresLabel: string;
  /** Canonical HTTPS share URL (vanity slug when set) — built on the server. */
  recipientShareUrl: string;
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
  const [readingMode, setReadingMode] = useState(false);
  const [readingPortalReady, setReadingPortalReady] = useState(false);

  const hasRecipientVaultFiles = vaultHasRecipientVisibleDocument(metadata);
  const shareBannerSrc = metadata.shareBanner
    ? `/api/vaults/${metadata.slug}/share-banner`
    : null;
  const headRecipientFile = recipientVisibleVaultFiles(metadata)[0];

  const orderedImagePreviewEntries = useMemo(() => {
    const out: { id: string; objectUrl: string; downloadName: string }[] = [];
    for (const f of recipientVisibleVaultFiles(metadata)) {
      if (!f.mimeType.startsWith("image/")) continue;
      const ent = decryptedFiles[f.id];
      if (ent) out.push({ id: f.id, ...ent });
    }
    return out;
  }, [metadata, decryptedFiles]);

  const unlockedManifestFiles = useMemo(
    () => recipientVisibleVaultFiles(metadata).filter((f) => decryptedFiles[f.id]),
    [metadata, decryptedFiles],
  );

  const viewerWatermarkLabel =
    acceptance?.signerEmail && objectUrl && hasRecipientVaultFiles
      ? `${acceptance.signerEmail} · ${acceptance.signerName || "Viewer"} · ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}`
      : objectUrl && hasRecipientVaultFiles
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
    setReadingPortalReady(true);
  }, []);

  useEffect(() => {
    if (!objectUrl) setReadingMode(false);
  }, [objectUrl]);

  useEffect(() => {
    if (!readingMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setReadingMode(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [readingMode]);

  useEffect(() => {
    void fetch(`/api/vaults/${metadata.slug}/view`, { method: "POST" });
  }, [metadata.slug]);

  // Fetch file manifest when access is granted or room doesn't require NDA
  const [filesList, setFilesList] = useState<
    Array<{ id: string; name: string; mimeType: string; sizeBytes: number; category?: string; addedAt?: string }>
  >([]);
  const [fetchedFiles, setFetchedFiles] = useState(false);
  useEffect(() => {
    const needsIdentity =
      metadata.requiresNda || Boolean(metadata.restrictRecipientEmails);
    if (!accessGranted && needsIdentity) return;
    if (fetchedFiles) return;
    setFetchedFiles(true);
    void (async () => {
      try {
        const res = await fetch(`/api/vaults/${metadata.slug}/bundle`);
        if (res.ok) {
          const data = (await res.json()) as {
            files?: Array<{
              id: string;
              name: string;
              mimeType: string;
              sizeBytes: number;
              category?: string;
              addedAt?: string;
            }>;
          };
          if (data.files) setFilesList(data.files);
        }
      } catch { /* non-fatal */ }
    })();
  }, [
    accessGranted,
    metadata.requiresNda,
    metadata.restrictRecipientEmails,
    metadata.slug,
    fetchedFiles,
  ]);

  const openDecryptedVaultFile = useCallback(
    (fileId: string) => {
      const blob = decryptedFiles[fileId];
      if (!blob) return;
      const { objectUrl: url, downloadName: fname } = blob;
      const manifestFile = recipientVisibleVaultFiles(metadata).find((f) => f.id === fileId);
      const fileMeta = filesList.find((f) => f.id === fileId);
      const mime = fileMeta?.mimeType ?? manifestFile?.mimeType ?? metadata.mimeType;
      const isPreviewable =
        mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime.startsWith("text/");
      if (isPreviewable) {
        setObjectUrl(url);
        setDownloadName(fname);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        a.click();
      }
    },
    [decryptedFiles, filesList, metadata],
  );

  // Auto-decrypt on mount/refresh if password is saved in sessionStorage
  const autoDecryptAttempted = useRef(false);
  useEffect(() => {
    if (autoDecryptAttempted.current) return;
    if (!recipientVisibleVaultFiles(metadata).length) return;
    if (Object.keys(decryptedFiles).length > 0) return;
    if (!accessGranted && (metadata.requiresNda || metadata.restrictRecipientEmails)) return;
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
  }, [metadata, accessGranted]);

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
          const pw = password.trim();
          const urlsToRevoke = new Set<string>();
          for (const { objectUrl: u } of Object.values(decryptedFiles)) {
            urlsToRevoke.add(u);
          }
          if (objectUrl) urlsToRevoke.add(objectUrl);
          for (const u of urlsToRevoke) URL.revokeObjectURL(u);
          setDecryptedFiles({});

          const manifest = recipientVisibleVaultFiles(metadata);
          if (!manifest.length) {
            throw new Error("No encrypted file in this room yet.");
          }

          const results = await Promise.allSettled(
            manifest.map(async (file) => {
              const params = new URLSearchParams({ fileId: file.id });
              const res = await fetch(`/api/vaults/${metadata.slug}/bundle?${params}`, {
                method: "GET",
              });
              if (!res.ok) throw new Error(`Unable to fetch ${file.name}.`);
              const encryptedBytes = await res.arrayBuffer();
              const decrypted = await decryptFile({
                encryptedBytes,
                password: pw,
                salt: file.salt,
                iv: file.iv,
                pbkdf2Iterations: file.pbkdf2Iterations,
              });
              const blob = new Blob([decrypted], { type: file.mimeType });
              const url = URL.createObjectURL(blob);
              return { id: file.id, objectUrl: url, downloadName: file.name, mimeType: file.mimeType };
            }),
          );

          const newDecrypted: Record<string, { objectUrl: string; downloadName: string }> = {};
          for (const result of results) {
            if (result.status === "fulfilled") {
              newDecrypted[result.value.id] = {
                objectUrl: result.value.objectUrl,
                downloadName: result.value.downloadName,
              };
            }
          }
          if (!Object.keys(newDecrypted).length) {
            throw new Error("Unable to decrypt any files. Check your password.");
          }

          setDecryptedFiles(newDecrypted);
          const firstPreview =
            manifest.find((f) => {
              const t = f.mimeType;
              return (
                t.startsWith("image/") ||
                t === "application/pdf" ||
                t.startsWith("text/")
              );
            }) ?? manifest[0];
          const first = newDecrypted[firstPreview.id];
          if (first) {
            setObjectUrl(first.objectUrl);
            setDownloadName(first.downloadName);
          }
          setSuccess("Files decrypted locally. Swipe images or use arrows to browse.");

          try {
            sessionStorage.setItem(`tkn_share_pw_${metadata.slug}`, pw);
          } catch {
            /* sessionStorage unavailable */
          }

          void fetch(`/api/vaults/${metadata.slug}/view`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fileCount: Object.keys(newDecrypted).length }),
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
          if (data.accessGranted && data.hasAcceptedNda) {
            setAccessGranted(true);
            setSuccess(
              data.signerName
                ? `Welcome back — access granted for ${data.signerName}.`
                : "Access granted. Welcome back.",
            );
            router.refresh();
            return;
          }
          if (data.pendingEmail) {
            setSuccess("Code verified — please complete the NDA to access the room.");
            return;
          }
          setError("Unexpected response from server. Refresh and try again.");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Invalid access code.");
        }
      });
    };

    return (
      <>
        <ShareRecipientAppBar accessGranted={accessGranted} recipientShareUrl={recipientShareUrl} />
        <MobileShareViewer
        hasDocument={hasRecipientVaultFiles}
        shareBannerSrc={shareBannerSrc ?? undefined}
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
        decryptedFiles={decryptedFiles}
        activeFileName={downloadName}
        onDecryptedPreviewChange={(url, name) => {
          setObjectUrl(url);
          setDownloadName(name);
        }}
        signingInProgress={isPending}
      />
      </>
    );
  }

  // ── Desktop ────────────────────────────────────────────────────
  const ndaStepComplete = !metadata.requiresNda || accessGranted;

  const handleSign = () => {
    startTransition(async () => {
      setError("");
      try {
        const typedSig = ndaDraft.signatureName.trim();
        const signatureNameForApi = signatureImage
          ? typedSig || ndaDraft.signerName.trim()
          : typedSig;
        const res = await fetch(ndaPostPath, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signerName: ndaDraft.signerName,
            signerEmail: ndaDraft.signerEmail,
            signerCompany: ndaDraft.signerCompany,
            signerAddress: ndaDraft.signerAddress,
            signatureName: signatureNameForApi,
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
        const pw = password.trim();

        // Revoke previous blob URLs
        for (const { objectUrl: u } of Object.values(decryptedFiles)) {
          URL.revokeObjectURL(u);
        }
        setDecryptedFiles({});

        // Recipient-visible files only (owner may hide banner duplicates from the bundle).
        const manifest = recipientVisibleVaultFiles(metadata);
        if (!manifest.length) {
          throw new Error("No encrypted files in this room yet.");
        }

        const results = await Promise.allSettled(
          manifest.map(async (file) => {
            const params = new URLSearchParams({ fileId: file.id });
            const res = await fetch(`/api/vaults/${metadata.slug}/bundle?${params}`, { method: "GET" });
            if (!res.ok) throw new Error(`Unable to fetch ${file.name}.`);
            const encryptedBytes = await res.arrayBuffer();

            const decrypted = await decryptFile({
              encryptedBytes,
              password: pw,
              salt: file.salt,
              iv: file.iv,
              pbkdf2Iterations: file.pbkdf2Iterations,
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

        try {
          sessionStorage.setItem(`tkn_share_pw_${metadata.slug}`, pw);
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

  const ndaHeaderStepBadge = (n: number, done: boolean) => (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 text-sm font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        done ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {done ? <CheckCircle2 className="size-5" strokeWidth={1.75} /> : n}
    </div>
  );

  const previewable =
    hasRecipientVaultFiles &&
    Boolean(
      headRecipientFile?.mimeType.startsWith("image/") ||
        headRecipientFile?.mimeType === "application/pdf" ||
        headRecipientFile?.mimeType.startsWith("text/"),
    );

  const senderAttribution =
    metadata.senderName.trim() +
    (metadata.senderCompany?.trim() ? ` · ${metadata.senderCompany.trim()}` : "");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 sm:space-y-10 2xl:max-w-6xl">
      <ShareRecipientAppBar accessGranted={accessGranted} recipientShareUrl={recipientShareUrl} />
      {accessGranted ? (
        <ShareRecipientCompactHeader
          shareHostLabel={shareHostLabel}
          workspaceLogoUrl={workspaceLogoUrl}
          workspaceCompanyName={workspaceCompanyName}
          roomTitle={metadata.title}
          shareBannerSrc={shareBannerSrc}
          senderAttribution={senderAttribution}
          expiresLabel={shareExpiresLabel}
          roomNote={metadata.message?.trim() || null}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_28px_rgba(35,31,26,0.06)]">
          <ShareRecipientCompactHeader
            shareHostLabel={shareHostLabel}
            workspaceLogoUrl={workspaceLogoUrl}
            workspaceCompanyName={workspaceCompanyName}
            roomTitle={metadata.title}
            shareBannerSrc={shareBannerSrc}
            senderAttribution={senderAttribution}
            expiresLabel={shareExpiresLabel}
            roomNote={metadata.message?.trim() || null}
            embedInParent
            suppressHostBadge
          />
          {showReturnGate ? (
            <Card className="rounded-none border-0 shadow-none ring-0 gap-0 rounded-b-none border-t border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/60">
              <CardHeader className="rounded-none space-y-2.5 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <CardTitle className="text-sm font-medium tracking-tight text-foreground">
                  Access this room
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed text-[color:var(--tkn-text-support)]">
                  {metadata.restrictRecipientEmails
                    ? "We’ll email a code to the invited address only."
                    : metadata.requiresNda
                      ? "Use the same email as your NDA — we’ll send a one-time code."
                      : "We’ll email you a one-time code to verify it’s you."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-6 pt-1 sm:space-y-6 sm:px-6 sm:pb-7 sm:pt-2">
            {returnStep === "email" ? (
              <div className="mx-auto w-full max-w-md space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
                  Work email
                </p>
                <div className="flex h-11 overflow-hidden rounded-xl border-2 border-foreground/10 bg-card shadow-[0_2px_8px_rgba(35,31,26,0.06)] transition-[box-shadow,border-color] focus-within:border-[color:var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(243,91,45,0.18),0_2px_10px_rgba(35,31,26,0.07)]">
                  <div className="relative min-w-0 flex-1 bg-[color:var(--color-background-muted)]/80">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/35"
                      aria-hidden
                    />
                    <Input
                      id="return-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="h-11 rounded-none border-0 bg-transparent py-0 pl-10 pr-3 text-sm text-foreground placeholder:text-foreground/40 shadow-none focus-visible:ring-0"
                      value={returnEmail}
                      onChange={(e) => setReturnEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 min-w-[7.25rem] shrink-0 rounded-none border-0 border-l-2 border-foreground/10 px-5 text-sm font-semibold shadow-none sm:min-w-[8rem]"
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
                    {isPending ? "…" : "Send code"}
                  </Button>
                </div>
              </div>
            ) : (
              <FieldGroup className="mx-auto w-full max-w-md gap-5">
                <Field className="gap-3">
                  <FieldLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
                    6-digit code
                  </FieldLabel>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Sent to{" "}
                    <span className="font-medium text-foreground">{returnEmail}</span>
                  </p>
                  <InputOTP
                    autoFocus
                    maxLength={6}
                    value={returnCode}
                    onChange={(v) => setReturnCode(v.replace(/\D/g, "").slice(0, 6))}
                    containerClassName="max-w-full justify-start py-1"
                  >
                    <InputOTPGroup className="gap-2 border-0 bg-transparent sm:gap-2.5">
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-8 rounded-md border border-border bg-white text-xs font-semibold tabular-nums first:rounded-md first:border last:rounded-md sm:size-8"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </Field>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    className="h-8 px-4 text-xs font-medium"
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
                    {isPending ? "…" : "Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-[color:var(--tkn-panel-border)] px-4 text-xs bg-card"
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
              <p className="mt-2 border-t border-[color:var(--tkn-panel-border)] pt-5 text-center text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:pt-6">
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
          ) : (
            <div className="border-t border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50 px-5 py-4 sm:px-6">
              <p className="text-pretty text-sm leading-relaxed text-[color:var(--tkn-text-support)]">
                {metadata.requiresNda
                  ? "Sign the confidentiality agreement below to access this room."
                  : "Use the password from the sender to decrypt files below — nothing is sent to the server."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Alerts — kept high on the page so errors sit above the access form */}
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

      {/* Room info — only shown after access is granted */}
      {accessGranted ? (
        <>
          <div className="rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card px-4 py-4 shadow-[0_2px_28px_rgba(35,31,26,0.06)] sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <FileText className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Primary file
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground sm:text-[0.9375rem]">
                  {headRecipientFile ? headRecipientFile.name : "No document yet"}
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--tkn-text-support)]">
                  {headRecipientFile
                    ? `${formatBytes(headRecipientFile.sizeBytes)} · ${formatMimeLabel(headRecipientFile.mimeType)}`
                    : "The sender has not uploaded a file. Check back later."}
                </p>
              </div>
                           <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge
                  variant={objectUrl || Object.keys(decryptedFiles).length > 0 ? "secondary" : "outline"}
                  className="gap-1.5 border-[color:var(--tkn-panel-border)] font-normal"
                >
                  {!hasRecipientVaultFiles ? (
                    <><Clock className="size-3" /> Waiting</>
                  ) : objectUrl ? (
                    <><CheckCircle2 className="size-3" /> Viewing</>
                  ) : Object.keys(decryptedFiles).length > 0 ? (
                    <><CheckCircle2 className="size-3" /> Decrypted — pick a file</>
                  ) : (
                    <><Lock className="size-3" /> Encrypted</>
                  )}
                </Badge>
                {objectUrl && hasRecipientVaultFiles ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50"
                  >
                    <a href={objectUrl} download={downloadName}>
                      <Download className="size-4" />
                      Download
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Step 1: NDA — hidden when the return-visit gate is showing (returning users verify email first) */}
      {metadata.requiresNda && !showReturnGate ? (
        <Card className="overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_28px_rgba(35,31,26,0.06)] ring-0">
          <CardHeader className="gap-4 border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/40 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start gap-4">
              {ndaHeaderStepBadge(1, ndaStepComplete)}
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-pretty font-heading text-lg font-semibold leading-snug tracking-tight sm:text-xl">
                  {ndaCardTitle}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">{ndaCardDescription}</CardDescription>
              </div>
            </div>
            {acceptance ? (
              <CardAction>
                <Badge
                  variant="outline"
                  className="border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50 font-normal text-foreground"
                >
                  Signed {formatDateTime(acceptance.acceptedAt)}
                </Badge>
              </CardAction>
            ) : null}
          </CardHeader>

          {!accessGranted ? (
            <CardContent className="space-y-7 px-5 py-6 sm:space-y-8 sm:px-6 sm:py-8">
              {ndaStep === "identity" ? (
                <>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Step 1 of 3
                    </p>
                    <p className="text-base font-medium text-foreground">Your details</p>
                    <p className="text-sm leading-snug text-[color:var(--tkn-text-support)]">
                      Enter how you&apos;ll appear on the confidentiality agreement and access record.
                    </p>
                  </div>
                  <FieldGroup>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field className="gap-2">
                        <FieldLabel
                          htmlFor="signer-name"
                          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70"
                        >
                          Full name
                        </FieldLabel>
                        <Input
                          id="signer-name"
                          autoComplete="name"
                          className={ndaFormInputClassName}
                          value={ndaDraft.signerName}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerName: e.target.value }))
                          }
                          placeholder="Jane Doe"
                        />
                      </Field>
                      <Field className="gap-2">
                        <FieldLabel
                          htmlFor="signer-email"
                          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70"
                        >
                          Work email
                        </FieldLabel>
                        <Input
                          id="signer-email"
                          type="email"
                          autoComplete="email"
                          className={ndaFormInputClassName}
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
                  <label className="flex cursor-pointer items-start gap-3.5 rounded-xl bg-[color:var(--color-background-muted)]/55 px-4 py-4 text-sm shadow-[inset_0_0_0_1px_rgba(35,31,26,0.06)] sm:px-5 sm:py-4">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded-md border-2 border-foreground/12 text-[color:var(--color-accent)] accent-[color:var(--color-accent)]"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">Save my email for faster access</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[color:var(--tkn-text-support)]">
                        We&apos;ll send you a one-time code so you can return without re-signing. Your email is
                        stored securely and only used for room access.
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      type="button"
                      className="rounded-xl px-6 shadow-[0_2px_12px_rgba(243,91,45,0.22)]"
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
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Step 2 of 3
                    </p>
                    <p className="text-base font-medium text-foreground">Review</p>
                    <p className="text-sm leading-snug text-[color:var(--tkn-text-support)]">
                      Read the full agreement, then confirm to proceed to signing.
                    </p>
                  </div>
                  <div
                    className="tkn-prose max-h-[min(22rem,58vh)] min-h-[12rem] overflow-y-auto overscroll-contain rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/30 p-4 text-sm leading-relaxed text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:max-h-96 sm:p-5 [-webkit-overflow-scrolling:touch]"
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
                  <label
                    htmlFor="nda-agree"
                    className="flex cursor-pointer items-start gap-3.5 rounded-xl bg-[color:var(--color-background-muted)]/40 px-4 py-3 text-sm text-foreground shadow-[inset_0_0_0_1px_rgba(35,31,26,0.05)]"
                  >
                    <input
                      id="nda-agree"
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 rounded-md border-2 border-foreground/12 text-[color:var(--color-accent)] accent-[color:var(--color-accent)]"
                      checked={ndaReadConfirmed}
                      onChange={(e) => setNdaReadConfirmed(e.target.checked)}
                    />
                    <span className="leading-snug">I have read this agreement and agree to continue to sign.</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-[color:var(--tkn-panel-border)] bg-card"
                      onClick={() => setNdaStep("identity")}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="rounded-xl px-6 shadow-[0_2px_12px_rgba(243,91,45,0.22)]"
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
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Step 3 of 3
                    </p>
                    <p className="text-base font-medium text-foreground">Sign</p>
                    <p className="text-sm leading-snug text-[color:var(--tkn-text-support)]">
                      Complete your address and signature to accept the NDA and unlock the document
                      (after password).
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/45 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:px-5 sm:py-3.5">
                    <span className="font-medium text-foreground">{ndaDraft.signerName}</span>
                    <span className="mx-2 text-[color:var(--tkn-text-support)]">·</span>
                    <span className="text-[color:var(--tkn-text-support)]">{ndaDraft.signerEmail}</span>
                  </div>
                  <FieldGroup>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field className="gap-2">
                        <FieldLabel
                          htmlFor="signer-company"
                          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70"
                        >
                          Company
                        </FieldLabel>
                        <Input
                          id="signer-company"
                          className={ndaFormInputClassName}
                          value={ndaDraft.signerCompany}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerCompany: e.target.value }))
                          }
                          placeholder="Northlight Labs"
                        />
                      </Field>
                      <Field className="gap-2 sm:col-span-2">
                        <FieldLabel
                          htmlFor="signer-address"
                          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70"
                        >
                          Address
                        </FieldLabel>
                        <Textarea
                          id="signer-address"
                          className={cn(
                            "min-h-[5.5rem] rounded-xl border-2 border-foreground/10 bg-card px-3.5 py-3 text-sm shadow-[0_2px_8px_rgba(35,31,26,0.06)] transition-[box-shadow,border-color] placeholder:text-foreground/40 focus-visible:border-[color:var(--color-accent)] focus-visible:shadow-[0_0_0_3px_rgba(243,91,45,0.18),0_2px_10px_rgba(35,31,26,0.07)] focus-visible:ring-0",
                          )}
                          value={ndaDraft.signerAddress}
                          onChange={(e) =>
                            setNdaDraft((d) => ({ ...d, signerAddress: e.target.value }))
                          }
                          placeholder="123 Main St, City, State, Zip"
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                  <Separator className="bg-[color:var(--tkn-panel-border)]" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <FieldLabel className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
                        Your signature
                      </FieldLabel>
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
                        className="w-full rounded-xl border-[color:var(--tkn-panel-border)] bg-card sm:w-auto"
                        onClick={() => {
                          setNdaStep("review");
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="w-full rounded-xl px-6 shadow-[0_2px_12px_rgba(243,91,45,0.22)] sm:w-auto"
                        disabled={
                          isPending ||
                          !(signatureImage || ndaDraft.signatureName.trim().length >= 2) ||
                          !ndaDraft.signerAddress ||
                          ndaDraft.signerAddress.trim().length < 10
                        }
                        onClick={handleSign}
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
            <CardContent className="border-t border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/25 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--tkn-panel-border)] bg-card px-4 py-3 shadow-[0_2px_12px_rgba(35,31,26,0.05)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                <p className="min-w-0 text-sm leading-snug text-[color:var(--tkn-text-support)]">
                  <span className="font-medium text-foreground">{acceptance.signerName}</span>
                  <span> · {acceptance.signerEmail}</span>
                  {acceptance.signerCompany ? <span> · {acceptance.signerCompany}</span> : null}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDateTime(acceptance.acceptedAt)}
                  </span>
                </p>
                {signedNdaUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full shrink-0 rounded-xl border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/50 sm:w-auto"
                  >
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
      {(accessGranted || !metadata.requiresNda) &&
      (accessGranted || !showReturnGate) &&
      Object.keys(decryptedFiles).length === 0 ? (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Lock className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Decrypt files</CardTitle>
              <CardDescription>
                {hasRecipientVaultFiles
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
          ) : !hasRecipientVaultFiles ? (
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
        <div className="overflow-hidden rounded-2xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[0_2px_28px_rgba(35,31,26,0.06)]">
          {/* Preview area — shown when a file is selected */}
          {objectUrl ? (
            <div className="flex flex-col overflow-hidden">
              <div className="flex shrink-0 flex-col gap-2 border-b border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground sm:text-[0.9375rem]">
                    {downloadName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1.5 border-[color:var(--tkn-panel-border)] bg-white">
                    <a href={objectUrl} download={downloadName}>
                      <Download className="size-4" />
                      Download
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-[color:var(--tkn-panel-border)] bg-white"
                    onClick={() => setReadingMode(true)}
                    aria-label="Reading mode — full screen preview"
                  >
                    <BookOpen className="size-4" />
                    <span className="hidden sm:inline">Reading mode</span>
                    <span className="sm:hidden">Focus</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setObjectUrl(null)}
                  >
                    <ChevronLeft className="size-4" />
                    All files
                  </Button>
                </div>
              </div>
              <div
                className={cn(
                  "relative flex min-h-0 flex-col overflow-hidden bg-[color:var(--color-background-muted)]/25 lg:flex-row",
                  "h-[min(calc(100dvh-12rem),88dvh)] min-h-[min(48dvh,400px)] sm:h-[min(calc(100dvh-13rem),90dvh)] lg:h-[min(calc(100dvh-14rem),920px)] lg:min-h-[min(52dvh,480px)]",
                )}
              >
                <DesktopDecryptedPreviewContent
                  objectUrl={objectUrl}
                  downloadName={downloadName}
                  metadata={metadata}
                  vaultSlug={metadata.slug}
                  decryptedFiles={decryptedFiles}
                  unlockedManifestFiles={unlockedManifestFiles}
                  orderedImagePreviewEntries={orderedImagePreviewEntries}
                  viewerWatermarkLabel={viewerWatermarkLabel}
                  openDecryptedVaultFile={openDecryptedVaultFile}
                  setObjectUrl={setObjectUrl}
                  setDownloadName={setDownloadName}
                  readingStrip={false}
                />
              </div>
            </div>
                   ) : (
            /* File list — table view, grouped by category when set */
            <div className="space-y-6 px-4 py-5 sm:space-y-7 sm:px-6 sm:py-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Documents
                </p>
                <p className="text-sm leading-snug text-[color:var(--tkn-text-support)]">
                  <span className="font-medium text-foreground">
                    {Object.keys(decryptedFiles).length} file
                    {Object.keys(decryptedFiles).length !== 1 ? "s" : ""}
                  </span>{" "}
                  unlocked in this room. Open to preview (watermarked) or download the original.
                  {" "}
                  <span className="text-[color:var(--tkn-text-fine)]">
                    &apos;Added&apos; is when the sender published each file; new uploads get a new timestamp.
                  </span>
                </p>
              </div>
                           {(() => {
                const unlockedOrdered = unlockedManifestFiles;
                const hasCategories = unlockedOrdered.some((f) => Boolean(f.category));

                const renderFileTable = (files: typeof unlockedOrdered, sectionKey: string) => (
                  <div
                    key={sectionKey}
                    className="overflow-hidden rounded-xl border border-[color:var(--tkn-panel-border)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[color:var(--tkn-panel-border)] hover:bg-transparent">
                          <TableHead className="h-11 pl-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Name
                          </TableHead>
                          <TableHead className="hidden h-11 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                            Type
                          </TableHead>
                          <TableHead className="h-11 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Size
                          </TableHead>
                          <TableHead className="hidden h-11 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                            Added
                          </TableHead>
                          <TableHead className="h-11 w-[1%] pr-4 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span className="sr-only">Open</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((fileEntry) => {
                          const blob = decryptedFiles[fileEntry.id];
                          if (!blob) return null;
                          const { downloadName: fname } = blob;
                          const previewable =
                            fileEntry.mimeType.startsWith("image/") ||
                            fileEntry.mimeType === "application/pdf" ||
                            fileEntry.mimeType.startsWith("text/");
                          const rowLabel = `${fname}, ${previewable ? "open preview" : "download"}`;
                          return (
                            <TableRow
                              key={fileEntry.id}
                              tabIndex={0}
                              role="button"
                              aria-label={rowLabel}
                              className="cursor-pointer border-[color:var(--tkn-panel-border)] focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/35"
                              onClick={() => openDecryptedVaultFile(fileEntry.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openDecryptedVaultFile(fileEntry.id);
                                }
                              }}
                            >
                              <TableCell className="max-w-[10rem] py-3 pl-4 whitespace-normal sm:max-w-[20rem] md:max-w-[28rem]">
                                <span className="line-clamp-2 text-sm font-medium text-foreground">
                                  {fname}
                                </span>
                                <span className="mt-0.5 block text-xs text-[color:var(--tkn-text-support)] sm:hidden">
                                  {formatMimeLabel(fileEntry.mimeType)}
                                </span>
                              </TableCell>
                              <TableCell className="hidden py-3 text-[color:var(--tkn-text-support)] sm:table-cell">
                                {formatMimeLabel(fileEntry.mimeType)}
                              </TableCell>
                              <TableCell className="py-3 text-right text-sm tabular-nums text-[color:var(--tkn-text-support)]">
                                {formatBytes(fileEntry.sizeBytes)}
                              </TableCell>
                              <TableCell className="hidden py-3 text-sm text-[color:var(--tkn-text-support)] md:table-cell">
                                {fileEntry.addedAt ? formatDateTime(fileEntry.addedAt) : "—"}
                              </TableCell>
                              <TableCell className="py-3 pr-4 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-auto min-h-10 gap-0.5 px-3 py-2 text-xs font-semibold hover:bg-transparent sm:min-h-9 sm:py-1.5",
                                    previewable
                                      ? "text-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                      : "text-muted-foreground",
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDecryptedVaultFile(fileEntry.id);
                                  }}
                                >
                                  {previewable ? "Preview" : "Download"}
                                  <ChevronRight className="size-4 opacity-70" aria-hidden />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );

                if (!hasCategories) {
                  return renderFileTable(unlockedOrdered, "all");
                }

                const categoryMap = new Map<string, typeof unlockedOrdered>();
                const uncategorized: typeof unlockedOrdered = [];
                for (const f of unlockedOrdered) {
                  const cat = f.category;
                  if (cat) {
                    const list = categoryMap.get(cat) ?? [];
                    list.push(f);
                    categoryMap.set(cat, list);
                  } else {
                    uncategorized.push(f);
                  }
                }

                return (
                  <div className="space-y-6 sm:space-y-7">
                    {Array.from(categoryMap.entries()).map(([cat, files]) => (
                      <div key={cat}>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {cat}
                        </p>
                        {renderFileTable(files, `cat-${cat}`)}
                      </div>
                    ))}
                    {uncategorized.length > 0 ? (
                      <div>
                        {categoryMap.size > 0 ? (
                          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Other files
                          </p>
                        ) : null}
                        {renderFileTable(uncategorized, "uncat")}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
              <p className="rounded-xl border border-dashed border-[color:var(--tkn-panel-border)] bg-[color:var(--color-background-muted)]/35 px-4 py-3 text-center text-[11px] leading-relaxed text-[color:var(--tkn-text-support)] sm:px-5">
                Previews are watermarked. Downloads are the original decrypted file.
              </p>
              {(() => {
                const unlockedIds = new Set(Object.keys(decryptedFiles));
                const summaryFiles = filesList.filter((f) => unlockedIds.has(f.id));
                if (summaryFiles.length === 0) return null;
                return (
                  <RecipientRecordPanel
                    metadata={metadata}
                    recipientShareUrl={recipientShareUrl}
                    shareExpiresLabel={shareExpiresLabel}
                    files={summaryFiles}
                    acceptance={acceptance}
                  />
                );
              })()}
            </div>
          )}
        </div>
      ) : null}

      {readingPortalReady &&
      readingMode &&
      objectUrl &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex flex-col bg-background"
              style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-reading-mode-title"
            >
              <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[color:var(--tkn-panel-border)] bg-card px-3 shadow-sm sm:h-[3.25rem] sm:gap-3 sm:px-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1.5 px-2 text-foreground sm:px-3"
                  onClick={() => setReadingMode(false)}
                  aria-label="Exit reading mode"
                >
                  <ChevronLeft className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Exit reading mode</span>
                </Button>
                <p
                  id="share-reading-mode-title"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
                >
                  {downloadName}
                </p>
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3">
                  <a href={objectUrl} download={downloadName}>
                    <Download className="size-4 shrink-0" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--color-background-muted)]/25">
                <DesktopDecryptedPreviewContent
                  objectUrl={objectUrl}
                  downloadName={downloadName}
                  metadata={metadata}
                  vaultSlug={metadata.slug}
                  decryptedFiles={decryptedFiles}
                  unlockedManifestFiles={unlockedManifestFiles}
                  orderedImagePreviewEntries={orderedImagePreviewEntries}
                  viewerWatermarkLabel={viewerWatermarkLabel}
                  openDecryptedVaultFile={openDecryptedVaultFile}
                  setObjectUrl={setObjectUrl}
                  setDownloadName={setDownloadName}
                  readingStrip
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      <p className="mx-auto max-w-lg text-center text-[10px] leading-relaxed tracking-wide text-[color:var(--tkn-text-fine)] sm:text-[11px]">
        {SHARE_RECIPIENT_DISCLAIMER}
      </p>
    </div>
  );
}
