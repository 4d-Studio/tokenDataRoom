"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/dataroom/helpers";
import {
  MAX_SIGNERS_PER_SIGNING_REQUEST,
  type SigningRequest,
  type VaultEvent,
  type VaultRecord,
  vaultFilesList,
} from "@/lib/dataroom/types";
import { sortSigningSigners } from "@/lib/dataroom/document-signing";
import { Download, FileSignature, Plus, Trash2 } from "lucide-react";

type InviteLink = { email: string; name?: string; signerId: string; url: string };

export function VaultSigningWorkflows({
  metadata,
  ownerKey,
  onUpdate,
}: {
  metadata: VaultRecord;
  ownerKey: string;
  onUpdate: (metadata: VaultRecord, events: VaultEvent[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fileId, setFileId] = useState("");
  const [message, setMessage] = useState("");
  const [signerRows, setSignerRows] = useState([{ email: "", name: "" }]);
  const [inviteCache, setInviteCache] = useState<Record<string, InviteLink[]>>({});

  const pdfFiles = useMemo(
    () => vaultFilesList(metadata).filter((f) => f.mimeType === "application/pdf"),
    [metadata],
  );

  const requests = metadata.signingRequests ?? [];

  const setInvitesFor = (requestId: string, links: InviteLink[]) => {
    setInviteCache((c) => ({ ...c, [requestId]: links }));
  };

  const fetchInviteLinks = useCallback(
    async (requestId: string) => {
      const res = await fetch(`/api/vaults/${metadata.slug}/owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerKey,
          action: "get_signing_invite_links",
          requestId,
        }),
      });
      const data = (await res.json()) as { inviteLinks?: InviteLink[]; error?: string };
      if (!res.ok || !data.inviteLinks) {
        throw new Error(data.error || "Could not load invite links.");
      }
      setInvitesFor(requestId, data.inviteLinks);
    },
    [metadata.slug, ownerKey],
  );

  const createWorkflow = () => {
    setError("");
    const signers = signerRows
      .map((r) => ({
        email: r.email.trim(),
        name: r.name.trim() || undefined,
      }))
      .filter((s) => s.email.length > 0);
    if (!fileId) {
      setError("Choose a PDF to collect signatures on.");
      return;
    }
    if (signers.length === 0) {
      setError("Add at least one signer email.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/vaults/${metadata.slug}/owner`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ownerKey,
            action: "create_signing_request",
            fileId,
            message: message.trim() || undefined,
            signers,
          }),
        });
        const data = (await res.json()) as {
          metadata?: VaultRecord;
          events?: VaultEvent[];
          inviteLinks?: InviteLink[];
          error?: string;
        };
        if (!res.ok || !data.metadata || !data.events) {
          throw new Error(data.error || "Could not create signing workflow.");
        }
        onUpdate(data.metadata, data.events);
        if (data.inviteLinks?.length) {
          const rid = data.metadata.signingRequests?.[0]?.id;
          if (rid) setInvitesFor(rid, data.inviteLinks);
        }
        setMessage("");
        setSignerRows([{ email: "", name: "" }]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not create workflow.");
      }
    });
  };

  const voidWorkflow = (requestId: string) => {
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/vaults/${metadata.slug}/owner`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ownerKey,
            action: "void_signing_request",
            requestId,
          }),
        });
        const data = (await res.json()) as {
          metadata?: VaultRecord;
          events?: VaultEvent[];
          error?: string;
        };
        if (!res.ok || !data.metadata || !data.events) {
          throw new Error(data.error || "Could not void workflow.");
        }
        onUpdate(data.metadata, data.events);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not void workflow.");
      }
    });
  };

  const fileLabel = (id: string) => vaultFilesList(metadata).find((f) => f.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Send each signer their own link. Signing runs <strong className="text-foreground">in order</strong>{" "}
          (first row signs first). PDFs only for now — the file stays encrypted in the room; this records who
          signed and when (certificate), not an embedded PDF signature.
        </p>
        {metadata.restrictRecipientEmails ? (
          <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-400/90">
            This room restricts recipients: add every signer email to your Reviewers list before creating a
            workflow.
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {pdfFiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Upload at least one PDF under Room documents to start a signing workflow.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-muted/15 p-4">
          <Field>
            <FieldLabel>PDF document</FieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
            >
              <option value="">Select a PDF…</option>
              {pdfFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>Optional note to signers</FieldLabel>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              placeholder="e.g. Please sign the SAFE attached in this room."
              className="min-h-[4rem] text-sm"
            />
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Signers (order matters)</p>
            {signerRows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field className="flex-1">
                  <FieldLabel className="sr-only">Email {i + 1}</FieldLabel>
                  <Input
                    type="email"
                    placeholder={`Signer ${i + 1} email`}
                    value={row.email}
                    onChange={(e) => {
                      const next = [...signerRows];
                      next[i] = { ...next[i], email: e.target.value };
                      setSignerRows(next);
                    }}
                    className="text-sm"
                  />
                </Field>
                <Field className="sm:w-40">
                  <FieldLabel className="sr-only">Name {i + 1}</FieldLabel>
                  <Input
                    placeholder="Name (optional)"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...signerRows];
                      next[i] = { ...next[i], name: e.target.value };
                      setSignerRows(next);
                    }}
                    className="text-sm"
                  />
                </Field>
                {signerRows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSignerRows(signerRows.filter((_, j) => j !== i))}
                    aria-label={`Remove signer ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {signerRows.length < MAX_SIGNERS_PER_SIGNING_REQUEST ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setSignerRows([...signerRows, { email: "", name: "" }])}
              >
                <Plus className="size-3.5" />
                Add signer
              </Button>
            ) : null}
          </div>
          <Button type="button" disabled={isPending} onClick={createWorkflow}>
            Create workflow &amp; generate links
          </Button>
        </div>
      )}

      {requests.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflows in this room
          </p>
          <ul className="space-y-3">
            {requests.map((req) => (
              <WorkflowCard
                key={req.id}
                metadata={metadata}
                ownerKey={ownerKey}
                request={req}
                fileLabel={fileLabel(req.fileId)}
                inviteLinks={inviteCache[req.id]}
                isPending={isPending}
                onVoid={() => voidWorkflow(req.id)}
                onRefreshLinks={() =>
                  startTransition(() => {
                    void fetchInviteLinks(req.id).catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Could not load links."),
                    );
                  })
                }
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function WorkflowCard({
  metadata,
  ownerKey,
  request,
  fileLabel,
  inviteLinks,
  isPending,
  onVoid,
  onRefreshLinks,
}: {
  metadata: VaultRecord;
  ownerKey: string;
  request: SigningRequest;
  fileLabel: string;
  inviteLinks: InviteLink[] | undefined;
  isPending: boolean;
  onVoid: () => void;
  onRefreshLinks: () => void;
}) {
  const ordered = sortSigningSigners(request);
  const certUrl = `/api/vaults/${metadata.slug}/signing/${request.id}/certificate?key=${encodeURIComponent(ownerKey)}`;

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileSignature className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate text-sm font-medium text-foreground">{fileLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Started {formatDateTime(request.createdAt)} ·{" "}
            <span className="font-medium text-foreground">{request.status}</span>
          </p>
        </div>
        {request.status === "active" ? (
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onVoid}>
            Void workflow
          </Button>
        ) : null}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {ordered.map((s) => (
          <li key={s.id} className="flex justify-between gap-2">
            <span>
              {s.order + 1}. {s.name || s.email}
            </span>
            <span className="shrink-0 text-foreground">
              {s.status === "signed" ? `Signed ${s.signedAt ? formatDateTime(s.signedAt) : ""}` : "Pending"}
            </span>
          </li>
        ))}
      </ul>
      {request.status === "active" ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={onRefreshLinks}>
              Show invite links
            </Button>
          </div>
          {inviteLinks?.length ? (
            <ul className="space-y-2">
              {inviteLinks.map((link) => (
                <li
                  key={link.signerId}
                  className="flex flex-col gap-1 rounded-md border border-border/80 bg-muted/20 p-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="truncate text-xs text-foreground">
                    {link.name ? `${link.name} · ` : ""}
                    {link.email}
                  </span>
                  <CopyButton value={link.url} label="Copy link" className="h-8 shrink-0 text-xs" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Links are shown after you create a workflow, or tap &quot;Show invite links&quot; to generate
              fresh links.
            </p>
          )}
        </div>
      ) : null}
      {request.status === "completed" ? (
        <div className="mt-3 border-t border-border pt-3">
          <Button asChild variant="outline" size="sm" className="gap-1">
            <a href={certUrl}>
              <Download className="size-3.5" />
              Download certificate
            </a>
          </Button>
        </div>
      ) : null}
    </li>
  );
}
