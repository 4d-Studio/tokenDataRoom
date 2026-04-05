"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Download,
  Link2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { VaultOwnerDocumentUpload } from "@/components/dataroom/vault-owner-document-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateTime, shortenUrlForDisplay } from "@/lib/dataroom/helpers";
import {
  vaultHasEncryptedDocument,
  type VaultAcceptanceRecord,
  type VaultEvent,
  type VaultRecord,
} from "@/lib/dataroom/types";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<VaultEvent["type"], string> = {
  created: "Room created",
  viewed: "Share page opened",
  nda_accepted: "NDA accepted",
  downloaded: "Encrypted bundle downloaded",
  signed_nda_downloaded: "Signed NDA downloaded",
  revoked: "Access revoked",
  reactivated: "Access restored",
  document_attached: "Document uploaded",
};

const SECTIONS = [
  { id: "owner-document", num: "1", label: "Room documents" },
  { id: "owner-notes", num: "2", label: "File notes" },
  { id: "owner-stats", num: "3", label: "Summary" },
  { id: "owner-reviewers", num: "4", label: "Reviewers" },
  { id: "owner-timeline", num: "5", label: "Timeline" },
  { id: "owner-overview", num: "6", label: "Links & access" },
] as const;

function SectionNav() {
  return (
    <nav
      className="flex gap-0.5 overflow-x-auto border-b border-border pb-2 lg:sticky lg:top-20 lg:w-[10.5rem] lg:shrink-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3"
      aria-label="Manage room sections"
    >
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={cn(
            "whitespace-nowrap rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
            "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            "lg:block lg:rounded-sm lg:px-1.5 lg:py-1 lg:text-[12px]",
          )}
        >
          <span className="text-muted-foreground/80">{s.num}.</span> {s.label}
        </a>
      ))}
    </nav>
  );
}

function OwnerLinkCard({
  role,
  title,
  hint,
  url,
  copyLabel,
  dense,
}: {
  role: "recipient" | "private";
  title: string;
  hint: string;
  url: string;
  copyLabel: string;
  /** Narrow right column: tighter padding and full-width copy. */
  dense?: boolean;
}) {
  const isRecipient = role === "recipient";
  const preview = shortenUrlForDisplay(url, dense ? 34 : 52);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-px shadow-sm transition-shadow duration-200 hover:shadow-md",
        isRecipient
          ? "border-primary/25 bg-gradient-to-br from-primary/[0.1] via-transparent to-transparent"
          : "border-border bg-gradient-to-br from-muted/40 via-transparent to-transparent",
      )}
    >
      <div
        className={cn(
          "h-full rounded-[0.7rem] bg-card",
          dense ? "p-2.5" : "p-3.5",
          isRecipient ? "bg-gradient-to-br from-white via-white to-[var(--color-accent)]/[0.03]" : "bg-card",
        )}
      >
        <div className={cn("flex", dense ? "gap-2" : "gap-3")}>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border",
              dense ? "size-8" : "size-10",
              isRecipient
                ? "border-primary/20 bg-primary/[0.08] text-primary"
                : "border-border bg-muted/80 text-muted-foreground",
            )}
            aria-hidden
          >
            {isRecipient ? (
              <Link2 className={dense ? "size-3.5" : "size-4"} strokeWidth={2} />
            ) : (
              <LockKeyhole className={dense ? "size-3.5" : "size-4"} strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--tkn-text-fine)]">
                {isRecipient ? "For recipients" : "Owner only"}
              </p>
              <h3 className="text-[0.85rem] font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
              <p className={cn("tkn-fine mt-0.5 leading-snug", dense && "line-clamp-2")}>{hint}</p>
            </div>
            <div className="flex min-h-8 items-center gap-1 rounded-lg border border-border/80 bg-muted/30 py-0.5 pl-2 pr-0.5">
              <span
                className="min-w-0 flex-1 truncate font-mono text-[10px] leading-tight text-foreground"
                title={url}
              >
                {preview}
              </span>
              <CopyButton
                value={url}
                size="icon"
                variant={isRecipient ? "default" : "outline"}
                className="size-7 shrink-0"
                ariaLabel={copyLabel}
                title={url}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-lg border border-border bg-card p-3 shadow-sm tkn-elevated-panel sm:p-3.5",
        className,
      )}
    >
      <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export const VaultOwnerPanel = ({
  initialAcceptances,
  initialMetadata,
  initialEvents,
  ownerKey,
  shareUrl,
  manageUrl,
  signedNdaBaseUrl,
}: {
  initialAcceptances: VaultAcceptanceRecord[];
  initialMetadata: VaultRecord;
  initialEvents: VaultEvent[];
  ownerKey: string;
  shareUrl: string;
  manageUrl: string;
  signedNdaBaseUrl: string;
}) => {
  const router = useRouter();
  const [acceptances] = useState(initialAcceptances);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [ownerNotesDraft, setOwnerNotesDraft] = useState(
    initialMetadata.ownerNotes ?? "",
  );
  const [ownerNotesSaved, setOwnerNotesSaved] = useState(false);

  const hasDocument = vaultHasEncryptedDocument(metadata);

  const stats = useMemo(
    () => ({
      views: events.filter((event) => event.type === "viewed").length,
      accepts: events.filter((event) => event.type === "nda_accepted").length,
      downloads: events.filter((event) => event.type === "downloaded").length,
      signedCopies: events.filter((event) => event.type === "signed_nda_downloaded").length,
    }),
    [events],
  );

  const updateStatus = async (action: "revoke" | "restore") => {
    setError("");

    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ownerKey,
        action,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };

    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to update room status.");
    }

    setMetadata(payload.metadata);
    setEvents(payload.events);
  };

  const saveOwnerNotes = async () => {
    setError("");
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerKey,
        action: "save_owner_notes",
        ownerNotes: ownerNotesDraft,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };
    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to save notes.");
    }
    setMetadata(payload.metadata);
    setEvents(payload.events);
    setOwnerNotesSaved(true);
    setTimeout(() => setOwnerNotesSaved(false), 2500);
  };

  const deleteRoom = async () => {
    setError("");
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerKey }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Unable to delete room.");
    }
    router.push("/workspace");
  };

  const timelineDetail = (event: VaultEvent) => {
    const parts = [event.actorName, event.actorEmail, event.note].filter(Boolean);
    const extra = [event.actorAddress, event.ipAddress].filter(Boolean);
    const main = parts.length ? parts.join(" · ") : "System";
    if (extra.length === 0) return main;
    return `${main} (${extra.join(", ")})`;
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      <SectionNav />

      <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_min(18rem,100%)] xl:grid-cols-[minmax(0,1fr)_20.5rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionShell
            id="owner-document"
            title="1. Room documents"
            description="Files are encrypted in your browser before upload. Recipients only see the share link and password — not this page."
          >
            <VaultOwnerDocumentUpload
              variant="featured"
              slug={metadata.slug}
              ownerKey={ownerKey}
              metadata={metadata}
              onUploaded={(next, nextEvents) => {
                setMetadata(next);
                setEvents(nextEvents);
                setOwnerNotesDraft(next.ownerNotes ?? "");
              }}
            />
          </SectionShell>

          <SectionShell
            id="owner-notes"
            title="2. Notes on this file (private)"
            description="Only you see these notes; they are not shown to recipients."
          >
            {hasDocument ? (
              <div className="space-y-2">
                <Field>
                  <FieldLabel htmlFor="owner-file-notes" className="sr-only">
                    Notes
                  </FieldLabel>
                  <Textarea
                    id="owner-file-notes"
                    className="min-h-[5rem] resize-y text-sm"
                    value={ownerNotesDraft}
                    onChange={(e) => setOwnerNotesDraft(e.target.value)}
                    placeholder="e.g. Q4 draft — send final after counsel review"
                    maxLength={4000}
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        void saveOwnerNotes().catch((e: unknown) => {
                          setError(e instanceof Error ? e.message : "Unable to save notes.");
                        });
                      })
                    }
                  >
                    Save notes
                  </Button>
                  {ownerNotesSaved ? (
                    <span className="text-xs text-muted-foreground">Saved.</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Upload an encrypted file in section 1, then add notes here.
              </p>
            )}
          </SectionShell>

          <SectionShell id="owner-stats" title="3. Activity summary">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
              <span>
                <span className="font-semibold tabular-nums text-foreground">{stats.views}</span>{" "}
                <span className="text-muted-foreground">opens</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums text-foreground">{stats.accepts}</span>{" "}
                <span className="text-muted-foreground">NDAs</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums text-foreground">{stats.downloads}</span>{" "}
                <span className="text-muted-foreground">downloads</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums text-foreground">{stats.signedCopies}</span>{" "}
                <span className="text-muted-foreground">NDA copies</span>
              </span>
            </div>
          </SectionShell>

          <SectionShell
            id="owner-reviewers"
            title="4. Signed reviewers"
            description="Reviewer records attach to the room after NDA completion."
          >
            {acceptances.length ? (
              <ul className="divide-y divide-border">
                {acceptances.map((acceptance) => (
                  <li
                    key={acceptance.id}
                    className="flex flex-col gap-1.5 py-2 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 text-[13px]">
                      <div className="font-medium text-foreground">{acceptance.signerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {acceptance.signerEmail}
                        {acceptance.signerCompany ? ` · ${acceptance.signerCompany}` : ""}
                      </div>
                      <div className="mt-1 flex items-start gap-1 text-xs text-foreground">
                        <MapPin className="mt-0.5 size-3 shrink-0 text-[var(--color-accent)]" />
                        <span className="leading-snug">{acceptance.signerAddress}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                      <time className="text-[11px] tabular-nums text-muted-foreground">
                        {formatDateTime(acceptance.acceptedAt)}
                      </time>
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <a href={`${signedNdaBaseUrl}&acceptanceId=${acceptance.id}`}>
                          <Download className="size-3.5" />
                          Signed NDA
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border-0 bg-muted/25 py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheck className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">No signers yet</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Appear here after recipients complete the NDA.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </SectionShell>

          <SectionShell
            id="owner-timeline"
            title="5. Timeline"
            description="Views, NDA acceptance, downloads, uploads, and status changes — newest at the top."
          >
            {events.length ? (
              <ul className="max-h-[min(46vh,20rem)] divide-y divide-border overflow-y-auto overscroll-contain">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-2 py-1 text-[11px] leading-snug sm:text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{EVENT_LABELS[event.type]}</span>
                      <span className="text-muted-foreground"> · {timelineDetail(event)}</span>
                    </div>
                    <time className="shrink-0 tabular-nums text-[10px] text-muted-foreground sm:text-[11px]">
                      {formatDateTime(event.occurredAt)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border-0 bg-muted/25 py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">No events yet</EmptyTitle>
                  <EmptyDescription className="text-xs">Activity will show here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </SectionShell>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <SectionShell id="owner-overview" title="6. Links & access" className="border-primary/15 bg-gradient-to-b from-primary/[0.03] to-card">
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary">
                  Owner
                </span>
                <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Room name
                </p>
                <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">{metadata.title}</p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  The management link is secret — it can revoke access or delete the room. Recipients use
                  the share link only.
                </p>
              </div>

              <dl className="grid gap-2 border-t border-border pt-3 text-[11px]">
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {metadata.status === "active" ? "Active room" : "Revoked"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Expires
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums text-foreground">
                    {formatDateTime(metadata.expiresAt)}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <OwnerLinkCard
                  role="recipient"
                  title="Share link"
                  hint="Send with the room password. Recipients never see owner tools."
                  url={shareUrl}
                  copyLabel="Copy room link"
                  dense
                />
                <OwnerLinkCard
                  role="private"
                  title="Management link"
                  hint="Keep private — same control as this page."
                  url={manageUrl}
                  copyLabel="Copy management link"
                  dense
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                variant={metadata.status === "active" ? "destructive" : "default"}
                onClick={() =>
                  startTransition(() => {
                    void updateStatus(metadata.status === "active" ? "revoke" : "restore").catch(
                      (caughtError: unknown) => {
                        setError(
                          caughtError instanceof Error
                            ? caughtError.message
                            : "Unable to update room status.",
                        );
                      },
                    );
                  })
                }
              >
                <LockKeyhole className="size-3.5" />
                {metadata.status === "active" ? "Revoke" : "Restore"}
              </Button>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete room
                </Button>
              ) : (
                <div className="flex w-full min-w-[16rem] flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground">Delete this room?</p>
                    <p className="text-xs text-muted-foreground">
                      This removes the room and its encrypted files. Type DELETE to confirm.
                    </p>
                    <Input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="h-8 text-sm"
                      autoFocus
                      aria-label="Type DELETE to confirm room deletion"
                    />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isPending || deleteInput !== "DELETE"}
                      onClick={() =>
                        startTransition(() => {
                          void deleteRoom().catch((e: unknown) => {
                            setError(e instanceof Error ? e.message : "Unable to delete.");
                          });
                        })
                      }
                    >
                      Delete room
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              </div>

              {error ? (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </SectionShell>
        </aside>
      </div>
    </div>
  );
};
