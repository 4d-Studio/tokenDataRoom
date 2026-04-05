"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Download,
  Eye,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { VaultOwnerDocumentUpload } from "@/components/dataroom/vault-owner-document-upload";
import {
  ProductListRow,
  ProductMetaBlock,
  ProductMetric,
  ProductPageIntro,
  ProductSectionBody,
  ProductSectionCard,
  ProductSectionHeader,
} from "@/components/dataroom/product-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/dataroom/helpers";
import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultRecord,
} from "@/lib/dataroom/types";

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <ProductSectionCard>
          <ProductSectionHeader
            title="Room documents"
            description="Drag and drop or browse. Files encrypt in your browser before they leave your device. Recipients only see the share link — not this page."
          />
          <ProductSectionBody className="pt-5">
            <VaultOwnerDocumentUpload
              variant="featured"
              slug={metadata.slug}
              ownerKey={ownerKey}
              metadata={metadata}
              onUploaded={(next, nextEvents) => {
                setMetadata(next);
                setEvents(nextEvents);
              }}
            />
          </ProductSectionBody>
        </ProductSectionCard>

        <ProductSectionCard>
          <ProductSectionHeader
            title="Review who opened, signed, and downloaded."
            description="This view keeps the room operational: access state, reviewer records, and the event timeline."
            action={
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Activity
              </Badge>
            }
          />
          <ProductSectionBody className="pt-5">
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <ProductMetric icon={<Eye className="h-4 w-4" />} value={stats.views} label="Share opens" />
              <ProductMetric icon={<ShieldCheck className="h-4 w-4" />} value={stats.accepts} label="NDAs accepted" />
              <ProductMetric icon={<Activity className="h-4 w-4" />} value={stats.downloads} label="Bundle fetches" />
              <ProductMetric icon={<Download className="h-4 w-4" />} value={stats.signedCopies} label="Signed NDA copies" />
            </div>
          </ProductSectionBody>
        </ProductSectionCard>

        <ProductSectionCard>
          <ProductSectionHeader
            title="Signed reviewers and addresses."
            description="Signed reviewer records are attached to the room after NDA completion."
            action={
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {acceptances.length} signed
              </Badge>
            }
          />
          <ProductSectionBody className="pt-5">
            {acceptances.length ? (
              acceptances.map((acceptance) => (
                <ProductListRow key={acceptance.id}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--color-foreground)]">
                      {acceptance.signerName}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {acceptance.signerEmail}
                      {acceptance.signerCompany ? ` · ${acceptance.signerCompany}` : ""}
                    </div>
                    <div className="mt-3 inline-flex items-start gap-2 text-sm leading-6 text-[var(--color-foreground)]">
                      <MapPin className="mt-1 h-4 w-4 text-[var(--color-accent)]" />
                      <span>{acceptance.signerAddress}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDateTime(acceptance.acceptedAt)}
                    </div>
                    <Button asChild variant="outline">
                      <a href={`${signedNdaBaseUrl}&acceptanceId=${acceptance.id}`}>
                        <Download data-icon="inline-start" />
                        Signed NDA
                      </a>
                    </Button>
                  </div>
                </ProductListRow>
              ))
            ) : (
              <Empty className="border-border bg-[var(--muted)]/35">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheck />
                  </EmptyMedia>
                  <EmptyTitle>No signed reviewers yet</EmptyTitle>
                  <EmptyDescription>
                    Signed reviewers will appear here after recipients complete the NDA.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </ProductSectionBody>
        </ProductSectionCard>

        <ProductSectionCard>
          <ProductSectionHeader
            title="Timeline"
            description="Every room event lands here, including views, NDA acceptance, downloads, and status changes."
          />
          <ProductSectionBody className="pt-5">
            {events.length ? (
              events.map((event) => (
                <ProductListRow key={event.id}>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-foreground)]">
                      {EVENT_LABELS[event.type]}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {event.actorName || event.actorEmail || event.note || "System event"}
                    </div>
                    {event.actorEmail || event.actorAddress || event.ipAddress ? (
                      <div className="mt-2 flex flex-col gap-1 text-xs leading-6 text-muted-foreground">
                        {event.actorEmail ? <div>Email: {event.actorEmail}</div> : null}
                        {event.actorAddress ? <div>Address: {event.actorAddress}</div> : null}
                        {event.ipAddress ? <div>IP: {event.ipAddress}</div> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </div>
                </ProductListRow>
              ))
            ) : (
              <Empty className="border-border bg-[var(--muted)]/35">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity />
                  </EmptyMedia>
                  <EmptyTitle>No activity yet</EmptyTitle>
                  <EmptyDescription>
                    Activity will appear here as recipients open the room, accept the NDA,
                    and fetch the encrypted file.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </ProductSectionBody>
        </ProductSectionCard>
      </div>

      <ProductSectionCard className="lg:sticky lg:top-5 lg:self-start">
        <ProductSectionBody className="p-5">
          <ProductPageIntro
            eyebrow="Owner controls"
            title={metadata.title}
            description="This management link is secret — it can revoke access and delete the room. Recipients use the share link only."
            className="pb-0"
            titleClassName="text-[1.35rem] sm:text-[1.5rem]"
            descriptionClassName="text-[0.88rem] leading-6"
          />

          <Separator className="my-4" />

          <div className="meta-grid">
            <div className="meta-row">
              <dt>Status</dt>
              <dd>{metadata.status === "active" ? "Active room" : "Revoked room"}</dd>
            </div>
            <div className="meta-row">
              <dt>Expires</dt>
              <dd>{formatDateTime(metadata.expiresAt)}</dd>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <ProductMetaBlock label="Share link">
              <div className="break-all">{shareUrl}</div>
              <div className="mt-3">
                <CopyButton value={shareUrl} label="Copy room link" />
              </div>
            </ProductMetaBlock>

            <ProductMetaBlock label="Management link">
              <div className="break-all">{manageUrl}</div>
              <div className="mt-3">
                <CopyButton value={manageUrl} label="Copy management link" />
              </div>
            </ProductMetaBlock>
          </div>

          <Separator className="my-4" />

          <div>
            <div className="label-title">Room status</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Revoke this room if access should stop immediately.
            </p>
            <Button
              type="button"
              disabled={isPending}
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
              variant={metadata.status === "active" ? "destructive" : "default"}
              className="mt-3.5 w-full justify-start"
            >
              <LockKeyhole data-icon="inline-start" />
              {metadata.status === "active" ? "Revoke room" : "Restore room"}
            </Button>
          </div>

          <Separator className="my-4" />

          <div>
            <div className="label-title">Delete room</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Permanently delete this room, its encrypted file, NDA records, and all activity. This cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-3.5 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 data-icon="inline-start" />
                Delete room permanently
              </Button>
            ) : (
              <div className="mt-3.5 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">
                  Type <span className="font-bold">DELETE</span> to confirm
                </p>
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending || deleteInput !== "DELETE"}
                    onClick={() =>
                      startTransition(() => {
                        void deleteRoom().catch((e: unknown) => {
                          setError(e instanceof Error ? e.message : "Unable to delete.");
                        });
                      })
                    }
                    className="flex-1"
                  >
                    <Trash2 data-icon="inline-start" />
                    Confirm delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
            <>
              <Separator className="my-4" />
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </>
          ) : null}
        </ProductSectionBody>
      </ProductSectionCard>
    </div>
  );
};
