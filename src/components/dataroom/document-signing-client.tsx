"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { SignatureCanvas } from "@/components/dataroom/signature-canvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FileSignature, Loader2 } from "lucide-react";

type BootstrapPhase =
  | "ready"
  | "waiting"
  | "already_signed"
  | "completed"
  | "voided"
  | "unknown_signer";

type Bootstrap = {
  title: string;
  senderName: string;
  fileName: string;
  message: string | null;
  phase: BootstrapPhase;
  signerEmail: string | null;
  signerName: string | null;
  signers: Array<{
    email: string;
    name?: string;
    order: number;
    status: string;
    signedAt?: string;
  }>;
};

export function DocumentSigningClient({
  canonicalSlug,
  requestId,
  initialToken,
}: {
  canonicalSlug: string;
  requestId: string;
  initialToken: string;
}) {
  const [token] = useState(initialToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Bootstrap | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [completedFlow, setCompletedFlow] = useState(false);

  const load = useCallback(async () => {
    if (!token.trim()) {
      setError("This signing link is missing a token. Use the full link from your email or the room owner.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/vaults/${canonicalSlug}/signing/${requestId}?token=${encodeURIComponent(token)}`,
      );
      const json = (await res.json()) as Bootstrap & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Unable to load signing page.");
      }
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canonicalSlug, requestId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    const typed = signatureName.trim();
    const hasSig = Boolean(signatureImage) || typed.length >= 2;
    if (!hasSig || !token) return;
    setSubmitting(true);
    setError("");
    try {
      const signatureNameForApi = signatureImage ? typed || (data?.signerName ?? "") : typed;
      const res = await fetch(`/api/vaults/${canonicalSlug}/signing/${requestId}/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          signatureName: signatureNameForApi,
          signatureImage,
        }),
      });
      const json = (await res.json()) as { error?: string; completed?: boolean };
      if (!res.ok) {
        throw new Error(json.error || "Could not record signature.");
      }
      setDone(true);
      setCompletedFlow(Boolean(json.completed));
      void load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not record signature.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading signing workflow…</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="page-shell max-w-lg py-16">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) return null;

  const certUrl = `/api/vaults/${canonicalSlug}/signing/${requestId}/certificate?token=${encodeURIComponent(token)}`;

  if (data.phase === "voided") {
    return (
      <main className="page-shell max-w-lg py-16">
        <Empty className="border bg-muted/20 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSignature className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="text-base">Workflow cancelled</EmptyTitle>
            <EmptyDescription className="text-sm">
              The room owner voided this signing workflow. Contact them if you still need to sign.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  if (data.phase === "unknown_signer") {
    return (
      <main className="page-shell max-w-lg py-16">
        <Alert variant="destructive">
          <AlertDescription>This link does not match the signing workflow.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (data.phase === "completed" || (done && completedFlow)) {
    return (
      <main className="page-shell max-w-lg py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {data.title}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Signing complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everyone has signed <span className="font-medium text-foreground">{data.fileName}</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="default">
              <a href={certUrl}>Download certificate</a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (data.phase === "waiting") {
    return (
      <main className="page-shell max-w-lg py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {data.title}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Not your turn yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This workflow signs in order. Another signer needs to finish before it is your turn for{" "}
            <span className="font-medium text-foreground">{data.fileName}</span>.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {data.signers.map((s) => (
              <li
                key={`${s.order}-${s.email}`}
                className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
              >
                <span className="text-muted-foreground">
                  {s.order + 1}. {s.name || s.email}
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {s.status === "signed" ? "Signed" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  if (data.phase === "already_signed" || (done && !completedFlow)) {
    return (
      <main className="page-shell max-w-lg py-16">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {data.title}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">You are signed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your signature on <span className="font-medium text-foreground">{data.fileName}</span> is
            recorded.{" "}
            {completedFlow
              ? "The workflow is complete."
              : "No further action is required from you — wait for other signers to finish."}
          </p>
          {!completedFlow ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Progress:{" "}
              <span className="font-medium text-foreground">
                {data.signers.filter((s) => s.status === "signed").length} / {data.signers.length}
              </span>{" "}
              signers.
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  // ready
  return (
    <main className="page-shell max-w-lg py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data.title}
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Sign document</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          From {data.senderName} · <span className="font-medium text-foreground">{data.fileName}</span>
        </p>
        {data.signerEmail ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Signing as <span className="text-foreground">{data.signerEmail}</span>
          </p>
        ) : null}
        {data.message ? (
          <p className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
            {data.message}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Electronic signature</p>
        <SignatureCanvas
          value={signatureName}
          imageValue={signatureImage}
          onChange={(text) => setSignatureName(text)}
          onImageChange={(img) => setSignatureImage(img)}
        />
        <Button
          type="button"
          className="mt-5 w-full"
          disabled={
            submitting ||
            !(Boolean(signatureImage) || signatureName.trim().length >= 2)
          }
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Recording…
            </>
          ) : (
            "Sign and continue"
          )}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Opens the room separately —{" "}
          <Link href={`/s/${canonicalSlug}`} className="underline underline-offset-2">
            view shared files
          </Link>
        </p>
      </div>
    </main>
  );
}
