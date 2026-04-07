"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Check,
  Download,
  Eye,
  ExternalLink,
  Link2,
  LockKeyhole,
  Mail,
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
import { Switch } from "@/components/ui/switch";
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
  access_requested: "Access code requested",
  access_verified: "Access code verified",
  invite_sent: "Invite email sent",
  nda_accepted: "NDA signed",
  files_decrypted: "Files decrypted",
  downloaded: "File downloaded",
  signed_nda_downloaded: "Signed NDA downloaded",
  revoked: "Access revoked",
  reactivated: "Access restored",
  document_attached: "Document updated",
};

const SECTIONS = [
  { id: "owner-settings", num: "1", label: "Room settings" },
  { id: "owner-document", num: "2", label: "Room documents" },
  { id: "owner-notes", num: "3", label: "File notes" },
  { id: "owner-stats", num: "4", label: "Summary" },
  { id: "owner-reviewers", num: "5", label: "Reviewers" },
  { id: "owner-timeline", num: "6", label: "Timeline" },
  { id: "owner-overview", num: "7", label: "Links & access" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function ManageStepsStrip({
  hasDocument,
  onGo,
}: {
  hasDocument: boolean;
  onGo: (id: SectionId) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Typical flow
      </p>
      <ol className="flex list-none flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
        <li className="flex flex-wrap items-center gap-2 text-[12px]">
          <button
            type="button"
            onClick={() => onGo("owner-document")}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Upload files
          </button>
          {hasDocument ? (
            <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <span className="text-[10px] text-amber-800/90 dark:text-amber-400/90">Do this first</span>
          )}
        </li>
        <li className="hidden text-muted-foreground sm:block" aria-hidden>
          →
        </li>
        <li className="flex flex-wrap items-center gap-2 text-[12px]">
          <button
            type="button"
            onClick={() => onGo("owner-overview")}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Copy share link
          </button>
        </li>
        <li className="hidden text-muted-foreground sm:block" aria-hidden>
          →
        </li>
        <li className="text-[11px] text-muted-foreground">
          Send the room password out of band (email, call). It is not stored on our servers.
        </li>
      </ol>
    </div>
  );
}

function SectionNav({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      className="flex gap-0.5 overflow-x-auto border-b border-border pb-2 lg:sticky lg:top-20 lg:w-[10.5rem] lg:shrink-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3"
      aria-label="Manage room sections"
    >
      {SECTIONS.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
              "lg:block lg:rounded-sm lg:px-1.5 lg:py-1 lg:text-[12px]",
              isActive
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <span className="text-muted-foreground/80">{s.num}.</span> {s.label}
          </button>
        );
      })}
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
  sensitivity = "normal",
}: {
  role: "recipient" | "private";
  title: string;
  hint: string;
  url: string;
  copyLabel: string;
  /** Narrow right column: tighter padding and full-width copy. */
  dense?: boolean;
  /** Secret links stay masked until the owner clicks Reveal. */
  sensitivity?: "normal" | "secret";
}) {
  const [revealed, setRevealed] = useState(false);
  const isRecipient = role === "recipient";
  const preview = shortenUrlForDisplay(url, dense ? 34 : 52);
  const showSecretChrome = sensitivity === "secret" && !revealed;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-px shadow-sm transition-shadow duration-200 hover:shadow-md",
        isRecipient
          ? "border-primary/25 bg-gradient-to-br from-primary/[0.1] via-transparent to-transparent"
          : sensitivity === "secret"
            ? "border-border/70 bg-gradient-to-br from-muted/25 via-transparent to-transparent"
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
            {showSecretChrome ? (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-2.5">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Hidden by default. Reveal only to copy — anyone with this link has owner-level control.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full sm:w-auto"
                  onClick={() => setRevealed(true)}
                >
                  <Eye className="size-3.5" />
                  Reveal link
                </Button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseOwnerEmailList(raw: string): string[] {
  const tokens = raw
    .split(/[\s,;]+/g)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 100) break;
  }
  return out;
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
  initialVanitySlug,
}: {
  initialAcceptances: VaultAcceptanceRecord[];
  initialMetadata: VaultRecord;
  initialEvents: VaultEvent[];
  ownerKey: string;
  shareUrl: string;
  manageUrl: string;
  signedNdaBaseUrl: string;
  initialVanitySlug: string | null;
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

  const [editTitle, setEditTitle] = useState(initialMetadata.title ?? "");
  const [editMessage, setEditMessage] = useState(initialMetadata.message ?? "");
  const [editSenderName, setEditSenderName] = useState(initialMetadata.senderName ?? "");
  const [editSenderCompany, setEditSenderCompany] = useState(initialMetadata.senderCompany ?? "");
  const [roomSettingsSaved, setRoomSettingsSaved] = useState(false);

  const [vanitySlug, setVanitySlug] = useState(initialVanitySlug ?? "");
  const [vanitySlugSaved, setVanitySlugSaved] = useState(false);
  const [vanitySlugError, setVanitySlugError] = useState("");
  const [currentVanitySlug, setCurrentVanitySlug] = useState(initialVanitySlug);
  /** Result of last completed remote check; `slug` must match input to be trusted. */
  const [remoteVanityCheck, setRemoteVanityCheck] = useState<{
    slug: string;
    result: "ok" | "taken" | "invalid";
  } | null>(null);

  const [allowedEmailsDraft, setAllowedEmailsDraft] = useState(() =>
    (initialMetadata.allowedRecipientEmails ?? []).join("\n"),
  );
  const [inviteBatchDraft, setInviteBatchDraft] = useState("");
  const [invitePasswordDraft, setInvitePasswordDraft] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");

  const [activeSection, setActiveSection] = useState<SectionId>("owner-settings");

  const shareBase = useMemo(() => shareUrl.split("/s/")[0] ?? shareUrl.replace(/\/s\/[^/]+$/, ""), [shareUrl]);
  const effectiveShareUrl = useMemo(() => {
    const pathSlug = currentVanitySlug ?? metadata.slug;
    return `${shareBase}/s/${pathSlug}`;
  }, [shareBase, currentVanitySlug, metadata.slug]);

  const trimmedVanityInput = vanitySlug.trim().toLowerCase();
  const needsVanityRemoteCheck =
    trimmedVanityInput.length >= 3 && trimmedVanityInput !== (currentVanitySlug ?? "");

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (SECTIONS.some((s) => s.id === raw)) {
      queueMicrotask(() => setActiveSection(raw as SectionId));
    }
  }, []);

  const selectSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  useEffect(() => {
    if (!needsVanityRemoteCheck) return;

    const ac = new AbortController();
    const query = trimmedVanityInput;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            ownerKey,
            action: "check_vanity_availability",
            vanitySlug: query,
          }),
        });
        const data = (await response.json()) as {
          available?: boolean;
          reason?: string;
        };
        if (ac.signal.aborted) return;
        const result: "ok" | "taken" | "invalid" = data.available
          ? "ok"
          : data.reason === "taken"
            ? "taken"
            : "invalid";
        setRemoteVanityCheck({ slug: query, result });
      } catch {
        if (!ac.signal.aborted) setRemoteVanityCheck(null);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [needsVanityRemoteCheck, trimmedVanityInput, metadata.slug, ownerKey]);

  const vanityAvailDisplay = (() => {
    if (trimmedVanityInput.length === 0) return "idle" as const;
    if (trimmedVanityInput.length < 3) return "short" as const;
    if (trimmedVanityInput === (currentVanitySlug ?? "")) return "ok_same" as const;
    if (!remoteVanityCheck || remoteVanityCheck.slug !== trimmedVanityInput) return "checking" as const;
    return remoteVanityCheck.result;
  })();

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

  const saveRoomSettings = async () => {
    setError("");
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerKey,
        action: "edit_room",
        title: editTitle,
        message: editMessage,
        senderName: editSenderName,
        senderCompany: editSenderCompany,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };
    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to save room settings.");
    }
    setMetadata(payload.metadata);
    setEvents(payload.events);
    setRoomSettingsSaved(true);
    setTimeout(() => setRoomSettingsSaved(false), 2500);
  };

  const saveVanitySlug = async () => {
    setVanitySlugError("");
    const trimmed = vanitySlug.trim().toLowerCase();
    if (!trimmed) {
      // Remove vanity slug
      const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerKey, action: "remove_vanity_slug" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to remove custom link.");
      setCurrentVanitySlug(null);
      setVanitySlug("");
      setRemoteVanityCheck(null);
      setVanitySlugSaved(true);
      setTimeout(() => setVanitySlugSaved(false), 2500);
      return;
    }
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerKey, action: "set_vanity_slug", vanitySlug: trimmed }),
    });
    const payload = (await response.json()) as {
      error?: string;
      vanitySlug?: string | null;
    };
    if (!response.ok) {
      setVanitySlugError(payload.error || "Unable to set custom link.");
      return;
    }
    setCurrentVanitySlug(payload.vanitySlug ?? trimmed);
    setVanitySlug(payload.vanitySlug ?? trimmed);
    setVanitySlugSaved(true);
    setTimeout(() => setVanitySlugSaved(false), 2500);
  };

  const setRecipientRestriction = async (enabled: boolean) => {
    setError("");
    setInviteFeedback("");
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerKey,
        action: "set_recipient_restriction",
        enabled,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };
    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to update invite settings.");
    }
    setMetadata(payload.metadata);
    setEvents(payload.events);
    setAllowedEmailsDraft((payload.metadata.allowedRecipientEmails ?? []).join("\n"));
  };

  const saveAllowedRecipientEmails = async () => {
    setError("");
    setInviteFeedback("");
    const emails = parseOwnerEmailList(allowedEmailsDraft);
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerKey,
        action: "replace_allowed_recipient_emails",
        emails,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };
    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to save the email list.");
    }
    setMetadata(payload.metadata);
    setEvents(payload.events);
    setAllowedEmailsDraft((payload.metadata.allowedRecipientEmails ?? []).join("\n"));
    setInviteFeedback("Saved invited addresses.");
    setTimeout(() => setInviteFeedback(""), 3000);
  };

  const sendRecipientInvites = async () => {
    setError("");
    setInviteFeedback("");
    const emails = parseOwnerEmailList(inviteBatchDraft);
    if (emails.length === 0) {
      throw new Error("Add at least one email address to invite.");
    }
    const pw = invitePasswordDraft.trim();
    if (!pw) {
      throw new Error(
        "Enter the room password so it can be included in the invite emails. It is not stored on our servers.",
      );
    }
    const response = await fetch(`/api/vaults/${metadata.slug}/owner`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerKey,
        action: "send_recipient_invites",
        emails,
        roomPassword: pw,
        shareUrl: effectiveShareUrl,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      metadata?: VaultRecord;
      events?: VaultEvent[];
    };
    if (!response.ok || !payload.metadata || !payload.events) {
      throw new Error(payload.error || "Unable to send invites.");
    }
    setMetadata(payload.metadata);
    setEvents(payload.events);
    setAllowedEmailsDraft((payload.metadata.allowedRecipientEmails ?? []).join("\n"));
    setInviteBatchDraft("");
    setInvitePasswordDraft("");
    setInviteFeedback(`Invite email processed for ${emails.length} address(es).`);
    setTimeout(() => setInviteFeedback(""), 5000);
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
    const main = parts.length ? parts.join(" · ") : "System";
    return main;
  };

  const timelineContext = (event: VaultEvent) => {
    const geo: string[] = [];
    if (event.city) geo.push(event.city);
    if (event.region) geo.push(event.region);
    if (event.country) geo.push(event.country);
    const parts: string[] = [];
    if (geo.length) parts.push(geo.join(", "));
    if (event.device) parts.push(event.device);
    if (event.ipAddress) parts.push(event.ipAddress);
    return parts;
  };

  const overviewShell = (
    <SectionShell id="owner-overview" title="Links & access" className="border-primary/15 bg-gradient-to-b from-primary/[0.03] to-card">
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-primary">
                  Owner
                </span>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Recipients only need the <span className="font-medium text-foreground">share link</span> and the
                  room password. The management link is equivalent to this page — keep it private.
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
                  url={effectiveShareUrl}
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
                  sensitivity="secret"
                />
              </div>

              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                    <Mail className="size-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Invite-only (optional)
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Restrict who can request an access code and download ciphertext to addresses you add.
                      Invite emails include the share link and room password you enter below; return visits still use the same email plus a one-time code.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                  <label
                    htmlFor="restrict-recipient-emails"
                    className="cursor-pointer text-xs leading-snug text-foreground"
                  >
                    Only invited emails can open this room
                  </label>
                  <Switch
                    id="restrict-recipient-emails"
                    checked={Boolean(metadata.restrictRecipientEmails)}
                    disabled={isPending}
                    onCheckedChange={(enabled) =>
                      startTransition(() => {
                        void setRecipientRestriction(enabled).catch((e: unknown) => {
                          setError(e instanceof Error ? e.message : "Unable to update setting.");
                        });
                      })
                    }
                  />
                </div>

                <Field>
                  <FieldLabel htmlFor="allowed-recipient-emails">Invited addresses (up to 100)</FieldLabel>
                  <Textarea
                    id="allowed-recipient-emails"
                    className="min-h-[5.5rem] resize-y font-mono text-xs"
                    value={allowedEmailsDraft}
                    onChange={(e) => setAllowedEmailsDraft(e.target.value)}
                    placeholder={"one@company.com\nother@company.com"}
                    maxLength={8000}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {(metadata.allowedRecipientEmails ?? []).length} saved
                    {metadata.restrictRecipientEmails ? " · restriction is on" : " · turn restriction on to enforce"}.
                  </p>
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      void saveAllowedRecipientEmails().catch((e: unknown) => {
                        setError(e instanceof Error ? e.message : "Unable to save list.");
                      });
                    })
                  }
                >
                  Save email list
                </Button>

                <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 space-y-2">
                  <p className="text-[11px] font-medium text-foreground">Send invite emails</p>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Adds addresses to the list (if missing), turns restriction on, and emails each person the current share link plus the password you type. The password is not stored on our servers.
                  </p>
                  <Field>
                    <FieldLabel htmlFor="invite-batch-emails">Emails to invite now</FieldLabel>
                    <Textarea
                      id="invite-batch-emails"
                      className="min-h-[3.5rem] resize-y font-mono text-xs"
                      value={inviteBatchDraft}
                      onChange={(e) => setInviteBatchDraft(e.target.value)}
                      placeholder="investor@firm.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="invite-room-password">Room password for this send</FieldLabel>
                    <Input
                      id="invite-room-password"
                      type="password"
                      autoComplete="off"
                      className="text-sm"
                      value={invitePasswordDraft}
                      onChange={(e) => setInvitePasswordDraft(e.target.value)}
                      placeholder="Same password recipients use to decrypt"
                    />
                  </Field>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        void sendRecipientInvites().catch((e: unknown) => {
                          setError(e instanceof Error ? e.message : "Unable to send invites.");
                        });
                      })
                    }
                  >
                    <Mail className="size-3.5" />
                    Send invites
                  </Button>
                </div>

                {inviteFeedback ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{inviteFeedback}</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-destructive/20 bg-destructive/[0.04] p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-destructive/90">
                  Danger zone
                </p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  Revoke blocks recipients until you restore. Delete removes the room and encrypted files permanently.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
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
              </div>

              {error ? (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </SectionShell>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      <SectionNav active={activeSection} onSelect={selectSection} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ManageStepsStrip hasDocument={hasDocument} onGo={selectSection} />

        <div
          className={cn(
            "grid min-w-0 flex-1 gap-4 lg:items-start",
            activeSection !== "owner-overview" &&
              "lg:grid-cols-[minmax(0,1fr)_min(18rem,100%)] xl:grid-cols-[minmax(0,1fr)_20.5rem]",
          )}
        >
        <div className="min-w-0">
          {activeSection === "owner-settings" ? (
            <SectionShell
              id="owner-settings"
              title="Room settings"
              description="Name, message, and sender details shown on the share page."
            >
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => selectSection("owner-overview")}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Links & access
                  </button>{" "}
                  — copy the share link, optional custom URL, revoke or delete.
                </p>
                <Field>
                  <FieldLabel htmlFor="edit-room-title">Room name</FieldLabel>
                  <Input
                    id="edit-room-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Series A Data Room"
                    maxLength={80}
                    className="text-sm"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-room-message">Message to recipients</FieldLabel>
                  <Textarea
                    id="edit-room-message"
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    placeholder="Brief note shown to recipients before they access the room"
                    maxLength={240}
                    className="min-h-[4rem] resize-y text-sm"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="edit-sender-name">Sender name</FieldLabel>
                    <Input
                      id="edit-sender-name"
                      value={editSenderName}
                      onChange={(e) => setEditSenderName(e.target.value)}
                      placeholder="Your name"
                      maxLength={60}
                      className="text-sm"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-sender-company">Company</FieldLabel>
                    <Input
                      id="edit-sender-company"
                      value={editSenderCompany}
                      onChange={(e) => setEditSenderCompany(e.target.value)}
                      placeholder="Company name"
                      maxLength={60}
                      className="text-sm"
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || editTitle.trim().length < 3}
                    onClick={() =>
                      startTransition(() => {
                        void saveRoomSettings().catch((e: unknown) => {
                          setError(e instanceof Error ? e.message : "Unable to save settings.");
                        });
                      })
                    }
                  >
                    <Check className="size-3.5" />
                    Save changes
                  </Button>
                  {roomSettingsSaved ? (
                    <span className="text-xs text-muted-foreground">Saved.</span>
                  ) : null}
                </div>

                {/* ── Vanity link ─────────────────────────── */}
                <div className="space-y-2 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Custom share link</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Optional short path instead of the auto-generated <span className="font-mono text-[10px]">{metadata.slug}</span>.
                      Anyone can open the landing page; NDA and the room password still protect access.
                    </p>
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Preview:{" "}
                    <span className="font-mono text-foreground">
                      {shareBase}/s/{vanitySlug.trim() || metadata.slug}
                    </span>
                  </p>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="shrink-0 text-muted-foreground">{shareBase}/s/</span>
                    <input
                      value={vanitySlug}
                      onChange={(e) => {
                        setVanitySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        setVanitySlugError("");
                      }}
                      placeholder={metadata.slug}
                      maxLength={60}
                      className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      aria-label="Custom path after /s/"
                    />
                  </div>
                  {trimmedVanityInput.length > 0 && vanityAvailDisplay !== "idle" && vanityAvailDisplay !== "ok_same" ? (
                    <p className="text-[11px] text-muted-foreground">
                      {vanityAvailDisplay === "short" ? <span>Type at least 3 characters.</span> : null}
                      {vanityAvailDisplay === "checking" ? "Checking availability…" : null}
                      {vanityAvailDisplay === "ok" ? (
                        <span className="text-emerald-700 dark:text-emerald-400">Available for this room.</span>
                      ) : null}
                      {vanityAvailDisplay === "taken" ? (
                        <span className="text-destructive">Already in use — try another.</span>
                      ) : null}
                      {vanityAvailDisplay === "invalid" ? (
                        <span className="text-destructive">
                          Use 3–60 characters: lowercase letters, numbers, hyphens. Cannot start with fm-.
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {vanityAvailDisplay === "ok_same" && trimmedVanityInput.length >= 3 ? (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">This is your active custom link.</p>
                  ) : null}
                  {currentVanitySlug ? (
                    <p className="text-xs text-muted-foreground">
                      Active link:{" "}
                      <span className="font-medium text-foreground">
                        {shareBase}/s/{currentVanitySlug}
                      </span>
                    </p>
                  ) : null}
                  {vanitySlugError ? <p className="text-xs text-destructive">{vanitySlugError}</p> : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        isPending ||
                        (!trimmedVanityInput && !currentVanitySlug) ||
                        (trimmedVanityInput === (currentVanitySlug ?? "") && trimmedVanityInput !== "") ||
                        (Boolean(trimmedVanityInput) &&
                          trimmedVanityInput !== (currentVanitySlug ?? "") &&
                          vanityAvailDisplay !== "ok")
                      }
                      onClick={() =>
                        startTransition(() => {
                          void saveVanitySlug().catch((e: unknown) => {
                            setVanitySlugError(e instanceof Error ? e.message : "Unable to save.");
                          });
                        })
                      }
                    >
                      <Link2 className="size-3.5" />
                      {vanitySlug.trim() ? "Set custom link" : "Remove custom link"}
                    </Button>
                    {vanitySlugSaved ? (
                      <span className="text-xs text-muted-foreground">Saved.</span>
                    ) : null}
                    <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" asChild>
                      <a href={effectiveShareUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                        Open recipient page
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </SectionShell>
          ) : null}

          {activeSection === "owner-document" ? (
            <SectionShell
              id="owner-document"
              title="Room documents"
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
          ) : null}

          {activeSection === "owner-notes" ? (
            <SectionShell
              id="owner-notes"
              title="Notes on this file (private)"
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
                  Upload an encrypted file under Room documents first, then add notes here.
                </p>
              )}
            </SectionShell>
          ) : null}

          {activeSection === "owner-stats" ? (
            <SectionShell id="owner-stats" title="Activity summary">
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
          ) : null}

          {activeSection === "owner-reviewers" ? (
            <SectionShell
              id="owner-reviewers"
              title="Signed reviewers"
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
          ) : null}

          {activeSection === "owner-timeline" ? (
            <SectionShell
              id="owner-timeline"
              title="Timeline"
              description="Views, NDA acceptance, downloads, uploads, and status changes — newest at the top."
            >
              {events.length ? (
                <ul className="max-h-[min(56vh,28rem)] divide-y divide-border overflow-y-auto overscroll-contain">
                  {events.map((event) => {
                    const ctx = timelineContext(event);
                    return (
                      <li key={event.id} className="flex gap-2 py-2 text-[11px] leading-snug sm:text-xs">
                        <div className="min-w-0 flex-1">
                          <div>
                            <span className="font-medium text-foreground">{EVENT_LABELS[event.type]}</span>
                            <span className="text-muted-foreground"> · {timelineDetail(event)}</span>
                          </div>
                          {ctx.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground/70">
                              {ctx.map((item, i) => (
                                <span key={i}>{item}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <time className="shrink-0 tabular-nums text-[10px] text-muted-foreground sm:text-[11px]">
                          {formatDateTime(event.occurredAt)}
                        </time>
                      </li>
                    );
                  })}
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
          ) : null}

          {activeSection === "owner-overview" ? overviewShell : null}
        </div>

        {activeSection !== "owner-overview" ? (
          <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">{overviewShell}</aside>
        ) : null}
        </div>
      </div>
    </div>
  );
};
