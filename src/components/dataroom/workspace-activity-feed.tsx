"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronsUpDown,
  Download,
  Eye,
  FileCheck2,
  FileSignature,
  KeyRound,
  LayoutPanelTop,
  Lock,
  Mail,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
  ProductSectionBody,
  ProductSectionCard,
  ProductSectionHeader,
} from "@/components/dataroom/product-ui";
import { cn } from "@/lib/utils";
import type { AggregatedVaultEvent } from "@/lib/dataroom/auth-store";
import type { VaultEventType } from "@/lib/dataroom/types";

const INITIAL_COUNT = 5;

export type WorkspaceActivityRow = AggregatedVaultEvent & {
  /** Short absolute time from the server so SSR and the first client paint match. */
  occurredAtFormatted: string;
};

const EVENT_CONFIG: Record<
  VaultEventType,
  { icon: typeof Eye; color: string; label: string; action: string }
> = {
  created: {
    icon: LayoutPanelTop,
    color: "text-[var(--color-accent)]",
    label: "Created",
    action: "created room",
  },
  viewed: {
    icon: Eye,
    color: "text-muted-foreground",
    label: "Opened",
    action: "opened",
  },
  nda_accepted: {
    icon: FileCheck2,
    color: "text-[var(--color-accent)]",
    label: "NDA Signed",
    action: "signed the NDA for",
  },
  downloaded: {
    icon: Download,
    color: "text-muted-foreground",
    label: "Downloaded",
    action: "downloaded from",
  },
  signed_nda_downloaded: {
    icon: Lock,
    color: "text-muted-foreground",
    label: "NDA Downloaded",
    action: "downloaded the signed NDA from",
  },
  revoked: {
    icon: Lock,
    color: "text-[var(--destructive)]",
    label: "Revoked",
    action: "revoked access to",
  },
  reactivated: {
    icon: RefreshCw,
    color: "text-[var(--color-accent)]",
    label: "Reactivated",
    action: "reactivated",
  },
  document_attached: {
    icon: Upload,
    color: "text-[var(--color-accent)]",
    label: "File added",
    action: "uploaded a document to",
  },
  file_renamed: {
    icon: PencilLine,
    color: "text-muted-foreground",
    label: "File renamed",
    action: "renamed a file in",
  },
  files_reordered: {
    icon: ChevronsUpDown,
    color: "text-muted-foreground",
    label: "Order changed",
    action: "reordered files in",
  },
  access_requested: {
    icon: Mail,
    color: "text-muted-foreground",
    label: "Code requested",
    action: "requested an access code for",
  },
  access_verified: {
    icon: ShieldCheck,
    color: "text-[var(--color-accent)]",
    label: "Verified",
    action: "verified identity for",
  },
  invite_sent: {
    icon: Mail,
    color: "text-[var(--color-accent)]",
    label: "Invite sent",
    action: "sent an invite for",
  },
  files_decrypted: {
    icon: KeyRound,
    color: "text-[var(--color-accent)]",
    label: "Decrypted",
    action: "decrypted files in",
  },
  document_signing_created: {
    icon: FileSignature,
    color: "text-[var(--color-accent)]",
    label: "Signing started",
    action: "started document signing in",
  },
  document_signing_signed: {
    icon: FileSignature,
    color: "text-muted-foreground",
    label: "Signing step",
    action: "signed a document in",
  },
  document_signing_completed: {
    icon: FileCheck2,
    color: "text-[var(--color-accent)]",
    label: "Signing done",
    action: "completed document signing in",
  },
  document_signing_voided: {
    icon: Lock,
    color: "text-[var(--destructive)]",
    label: "Signing voided",
    action: "voided document signing in",
  },
};

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ActivityIcon({ type }: { type: VaultEventType }) {
  const config = EVENT_CONFIG[type] ?? EVENT_CONFIG.created;
  const Icon = config.icon;
  return (
    <Icon
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0",
        config.color,
      )}
    />
  );
}

/** Relative times use Date.now() — switch from server label after mount only. */
function ActivityRelativeTime({
  isoDate,
  serverLabel,
}: {
  isoDate: string;
  serverLabel: string;
}) {
  const [label, setLabel] = useState(serverLabel);

  useEffect(() => {
    const tick = () => setLabel(formatRelativeTime(isoDate));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [isoDate]);

  return (
    <span className="tkn-fine shrink-0 tabular-nums">
      {label}
    </span>
  );
}

function ActivityRow({ event }: { event: WorkspaceActivityRow }) {
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.created;
  const actor = event.actorName || "Someone";
  const roomLink = `/m/${event.vaultSlug}`;

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3 rounded-md transition-colors hover:bg-muted/40 -mx-1 px-1 py-0.5">
        <ActivityIcon type={event.type} />
        <div className="min-w-0 text-[0.9rem] leading-snug">
          <span className="font-semibold text-foreground">{actor}</span>{" "}
          <span className="text-[var(--tkn-text-support)]">{config.action}</span>{" "}
          <Link
            href={roomLink}
            className="font-bold text-[var(--color-accent)] hover:underline"
          >
            {event.vaultTitle}
          </Link>
        </div>
      </div>
      <ActivityRelativeTime
        isoDate={event.occurredAt}
        serverLabel={event.occurredAtFormatted}
      />
    </div>
  );
}

export function ActivityFeedList({ events }: { events: WorkspaceActivityRow[] }) {
  if (events.length === 0) {
    return (
      <div className="tkn-support px-4 py-8 text-center">
        No activity yet. Events appear when recipients open rooms or sign your NDA.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </div>
  );
}

export function WorkspaceActivityFeed({
  events,
  hasRooms,
}: {
  events: WorkspaceActivityRow[];
  hasRooms: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (!hasRooms) return null;

  const visible = showAll ? events : events.slice(0, INITIAL_COUNT);
  const hasMore = events.length > INITIAL_COUNT;

  return (
    <ProductSectionCard className="mt-6">
      <ProductSectionHeader
        title="Activity"
        description="Opens, NDA signers, downloads, and uploads across your rooms."
      />

      <ProductSectionBody className="py-0">
        <ActivityFeedList events={visible} />
      </ProductSectionBody>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border py-3 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", showAll && "rotate-180")}
          />
          {showAll ? "Show less" : `View ${events.length - INITIAL_COUNT} more`}
        </button>
      )}
    </ProductSectionCard>
  );
}
