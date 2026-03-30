"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  Clock4,
  Download,
  Eye,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { CopyButton } from "@/components/filmia/copy-button";
import { formatDateTime } from "@/lib/filmia/helpers";
import type {
  VaultAcceptanceRecord,
  VaultEvent,
  VaultRecord,
} from "@/lib/filmia/types";

const EVENT_LABELS: Record<VaultEvent["type"], string> = {
  created: "Room created",
  viewed: "Share page opened",
  nda_accepted: "NDA accepted",
  downloaded: "Encrypted bundle downloaded",
  signed_nda_downloaded: "Signed NDA downloaded",
  revoked: "Access revoked",
  reactivated: "Access restored",
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
  const [acceptances] = useState(initialAcceptances);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="surface-panel p-6 sm:p-8">
        <p className="eyebrow">Room controls</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {metadata.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          Keep the management link private. Anyone with it can revoke or reactivate the
          room.
        </p>

        <div className="mt-8 grid gap-3">
          <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Share link
            </div>
            <div className="mt-2 break-all text-sm text-[var(--color-foreground)]">
              {shareUrl}
            </div>
            <div className="mt-3">
              <CopyButton value={shareUrl} label="Copy room link" />
            </div>
          </div>
          <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Management link
            </div>
            <div className="mt-2 break-all text-sm text-[var(--color-foreground)]">
              {manageUrl}
            </div>
            <div className="mt-3">
              <CopyButton value={manageUrl} label="Copy management link" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.12)] bg-white px-4 py-3 text-sm text-[var(--color-muted)]">
            <Clock4 className="h-4 w-4 text-[var(--color-accent)]" />
            Expires {formatDateTime(metadata.expiresAt)}
          </div>
        </div>

        <div className="mt-8 border-t border-[rgba(16,24,40,0.1)] pt-6">
          <div className="text-sm font-semibold text-[var(--color-foreground)]">
            Room status
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Revoke this room if access should stop immediately.
          </p>
          <div className="mt-4">
            <button
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
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                metadata.status === "active"
                  ? "border border-[#f1b8ae] bg-[#fff4f2] text-[#9f3d2f]"
                  : "bg-[var(--color-accent)] text-white hover:opacity-95"
              }`}
            >
              <LockKeyhole className="h-4 w-4" />
              {metadata.status === "active" ? "Revoke room" : "Restore room"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-[1rem] border border-[#f1b8ae] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f3d2f]">
            {error}
          </div>
        ) : null}
      </aside>

      <section className="surface-panel p-6 sm:p-8">
        <p className="eyebrow">Activity</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div className="metric-tile">
            <Eye className="h-4 w-4 text-[var(--color-accent)]" />
            <div className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">{stats.views}</div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">Share opens</div>
          </div>
          <div className="metric-tile">
            <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
            <div className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {stats.accepts}
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">NDAs accepted</div>
          </div>
          <div className="metric-tile">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            <div className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {stats.downloads}
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">Bundle fetches</div>
          </div>
          <div className="metric-tile">
            <Download className="h-4 w-4 text-[var(--color-accent)]" />
            <div className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {stats.signedCopies}
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">Signed NDA copies</div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.25rem] border border-[rgba(16,24,40,0.1)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--color-foreground)]">
                Reviewer tracking
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                Signed reviewers, address details, and downloadable NDA copies.
              </p>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {acceptances.length} signed
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {acceptances.length ? (
              acceptances.map((acceptance) => (
                <div
                  key={acceptance.id}
                  className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.8)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-foreground)]">
                        {acceptance.signerName}
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-muted)]">
                        {acceptance.signerEmail}
                        {acceptance.signerCompany ? ` · ${acceptance.signerCompany}` : ""}
                      </div>
                    </div>
                    <a
                      href={`${signedNdaBaseUrl}&acceptanceId=${acceptance.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.12)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
                    >
                      <Download className="h-4 w-4 text-[var(--color-accent)]" />
                      Signed NDA
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="rounded-[0.9rem] border border-[rgba(16,24,40,0.08)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)]">
                      <div className="inline-flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />
                        <span>{acceptance.signerAddress}</span>
                      </div>
                    </div>
                    <div className="rounded-[0.9rem] border border-[rgba(16,24,40,0.08)] bg-white px-4 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Signed
                      </div>
                      <div className="mt-2 text-sm text-[var(--color-foreground)]">
                        {formatDateTime(acceptance.acceptedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-[rgba(246,248,252,0.8)] p-4 text-sm text-[var(--color-muted)]">
                Signed reviewers will appear here after recipients complete the NDA.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--color-foreground)]">
                      {EVENT_LABELS[event.type]}
                    </div>
                    <div className="mt-1 text-sm text-[var(--color-muted)]">
                      {event.actorName || event.actorEmail || event.note || "System event"}
                    </div>
                    {event.actorEmail || event.actorAddress || event.ipAddress ? (
                      <div className="mt-2 space-y-1 text-xs leading-6 text-[var(--color-muted)]">
                        {event.actorEmail ? <div>Email: {event.actorEmail}</div> : null}
                        {event.actorAddress ? <div>Address: {event.actorAddress}</div> : null}
                        {event.ipAddress ? <div>IP: {event.ipAddress}</div> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    {formatDateTime(event.occurredAt)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4 text-sm text-[var(--color-muted)]">
              Activity will appear here as recipients open the room, accept the NDA, and
              fetch the encrypted file.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
