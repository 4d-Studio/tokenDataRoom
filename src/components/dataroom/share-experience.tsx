"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { MobileShareViewer } from "@/components/dataroom/mobile-share-viewer";
import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { decryptFile } from "@/lib/dataroom/client-crypto";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import { formatMimeLabel } from "@/lib/dataroom/room-contents";
import { isRichNdaContent } from "@/components/dataroom/rich-text-editor";
import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/dataroom/types";
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
import { Textarea } from "@/components/ui/textarea";

type AccessResponse = {
  acceptance?: VaultAcceptanceRecord;
  error?: string;
  signedNdaUrl?: string;
  success?: boolean;
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signedNdaUrl, setSignedNdaUrl] = useState(
    initialAcceptance ? `/api/vaults/${metadata.slug}/signed-nda` : "",
  );
  const [isPending, startTransition] = useTransition();

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
    }) => {
      startTransition(async () => {
        setError("");
        try {
          const res = await fetch(ndaPostPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(fields),
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
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to unlock document.");
        }
      });
    };

    return (
      <MobileShareViewer
        metadata={metadata}
        initialAcceptance={initialAcceptance}
        initialAccessGranted={initialAccessGranted}
        ndaCardTitle={ndaCardTitle}
        ndaDocumentText={ndaDocumentText}
        ndaPostPath={ndaPostPath}
        needsBootstrapFromWorkspace={needsBootstrapFromWorkspace}
        isPending={isPending}
        externalError={error}
        externalSuccess={success}
        onSignNda={handleSignNda}
        onUnlockDocument={handleUnlockDocument}
        onDismissError={() => setError("")}
        objectUrl={objectUrl}
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
            signerName: acceptance?.signerName,
            signerEmail: acceptance?.signerEmail,
            signerCompany: acceptance?.signerCompany,
            signerAddress: acceptance?.signerAddress,
            signatureName: acceptance?.signatureName,
            signatureImage,
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

  const handleUnlock = (password: string) => {
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
        setSuccess("Document decrypted locally. You can review it here or download it now.");

        const previewable =
          metadata.mimeType.startsWith("image/") ||
          metadata.mimeType === "application/pdf" ||
          metadata.mimeType.startsWith("text/");
        if (!previewable) {
          const link = document.createElement("a");
          link.href = url;
          link.download = metadata.fileName;
          link.click();
        }
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
    metadata.mimeType.startsWith("image/") ||
    metadata.mimeType === "application/pdf" ||
    metadata.mimeType.startsWith("text/");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* File info bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
          <FileText className="size-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{metadata.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(metadata.fileSize)} · {formatMimeLabel(metadata.mimeType)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={objectUrl ? "secondary" : "outline"} className="gap-1.5">
            {objectUrl ? (
              <><CheckCircle2 className="size-3" /> Unlocked</>
            ) : (
              <><Lock className="size-3" /> Encrypted</>
            )}
          </Badge>
          {objectUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={objectUrl} download={downloadName}>
                <Download className="size-4" />
                Download
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          Expires {formatDateTime(metadata.expiresAt)}
        </span>
        <span>
          Shared by {metadata.senderName}
          {metadata.senderCompany ? ` · ${metadata.senderCompany}` : ""}
        </span>
        {metadata.message ? (
          <span className="basis-full text-foreground">Note: {metadata.message}</span>
        ) : null}
      </div>

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
      {success ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {/* Step 1: NDA */}
      {metadata.requiresNda ? (
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
              <div
                className="tkn-prose max-h-64 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed text-foreground"
                tabIndex={0}
              >
                {isRichNdaContent(ndaDocumentText) ? (
                  <div dangerouslySetInnerHTML={{ __html: ndaDocumentText }} />
                ) : (
                  <div className="whitespace-pre-wrap">{ndaDocumentText}</div>
                )}
              </div>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="signer-name">Full name</FieldLabel>
                    <Input
                      id="signer-name"
                      value={acceptance?.signerName ?? ""}
                      onChange={(e) =>
                        setAcceptance((prev) =>
                          prev ? { ...prev, signerName: e.target.value } : prev,
                        )
                      }
                      placeholder="Jane Doe"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signer-email">Work email</FieldLabel>
                    <Input
                      id="signer-email"
                      value={acceptance?.signerEmail ?? ""}
                      onChange={(e) =>
                        setAcceptance((prev) =>
                          prev ? { ...prev, signerEmail: e.target.value } : prev,
                        )
                      }
                      placeholder="jane@company.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signer-company">Company</FieldLabel>
                    <Input
                      id="signer-company"
                      value={acceptance?.signerCompany ?? ""}
                      onChange={(e) =>
                        setAcceptance((prev) =>
                          prev ? { ...prev, signerCompany: e.target.value } : prev,
                        )
                      }
                      placeholder="Northlight Labs"
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="signer-address">Address</FieldLabel>
                    <Textarea
                      id="signer-address"
                      className="min-h-20"
                      value={acceptance?.signerAddress ?? ""}
                      onChange={(e) =>
                        setAcceptance((prev) =>
                          prev ? { ...prev, signerAddress: e.target.value } : prev,
                        )
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
                    value={acceptance?.signatureName ?? ""}
                    imageValue={signatureImage}
                    onChange={(text) =>
                      setAcceptance((prev) =>
                        prev ? { ...prev, signatureName: text } : prev,
                      )
                    }
                    onImageChange={(img) => setSignatureImage(img)}
                    placeholder="Jane Doe"
                  />
                </div>
                <Button
                  type="button"
                  disabled={
                    isPending ||
                    !acceptance?.signatureName ||
                    !acceptance?.signerName ||
                    !acceptance?.signerEmail ||
                    !acceptance?.signerAddress
                  }
                  onClick={handleSign}
                  className="w-full sm:w-auto"
                >
                  <ShieldCheck className="size-4" />
                  Sign and continue
                </Button>
              </div>
            </CardContent>
          ) : acceptance ? (
            <CardContent>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Signed by</p>
                  <p className="mt-1 font-medium text-foreground">{acceptance.signerName}</p>
                  <p className="text-muted-foreground">
                    {acceptance.signerEmail}
                    {acceptance.signerCompany ? ` · ${acceptance.signerCompany}` : ""}
                  </p>
                  <div className="mt-2 inline-flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5" />
                    <span>{acceptance.signerAddress}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Signature</p>
                  {acceptance.signatureImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={acceptance.signatureImage}
                      alt="Drawn signature"
                      className="mt-1 max-h-12 w-auto object-contain"
                    />
                  ) : (
                    <p className="mt-1 border-b pb-1 text-xl font-semibold tracking-tight text-foreground">
                      {acceptance.signatureName}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(acceptance.acceptedAt)}
                  </p>
                  {signedNdaUrl ? (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <a href={signedNdaUrl}>
                        <Download className="size-4" />
                        Download signed NDA
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {/* Step 2: Unlock */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            {stepNumber(metadata.requiresNda ? 2 : 1, Boolean(objectUrl))}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Unlock and preview</CardTitle>
              <CardDescription>
                Enter the password from the sender to decrypt this file locally in your browser.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={objectUrl ? "secondary" : "outline"}>
              {objectUrl ? "Open" : ndaStepComplete ? "Ready" : "Locked"}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          {metadata.status !== "active" ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Room inactive</AlertTitle>
              <AlertDescription>
                This room is no longer active. Contact the sender if you still need access.
              </AlertDescription>
            </Alert>
          ) : (
            <>
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
                  onClick={() => {
                    const pw = (
                      document.getElementById("document-password") as HTMLInputElement
                    )?.value;
                    if (pw) handleUnlock(pw);
                  }}
                >
                  <Lock className="size-4" />
                  Unlock
                </Button>
              </div>

              {objectUrl ? (
                <div className="overflow-hidden rounded-lg border bg-background">
                  {metadata.mimeType.startsWith("image/") ? (
                    <Image
                      src={objectUrl}
                      alt={downloadName}
                      width={1600}
                      height={1200}
                      unoptimized
                      className="h-auto w-full"
                    />
                  ) : metadata.mimeType === "application/pdf" ? (
                    <iframe
                      title={downloadName}
                      src={objectUrl}
                      className="h-[70vh] min-h-[24rem] w-full"
                    />
                  ) : (
                    <iframe
                      title={downloadName}
                      src={objectUrl}
                      className="h-[56vh] min-h-[20rem] w-full"
                    />
                  )}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Room opens, NDA acceptance, and downloads are recorded by Token.
      </p>
    </div>
  );
}
