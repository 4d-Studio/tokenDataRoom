"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useState } from "react";
import { Link2, Send, UserRound, X } from "lucide-react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { shortenUrlForDisplay } from "@/lib/dataroom/helpers";
import {
  peopleRowsFromBulkLists,
  serverListsFromPeopleRows,
  type PersonAccessRow,
} from "@/lib/dataroom/room-access-people";
import {
  MAX_ALLOWED_RECIPIENT_EMAILS,
  MAX_RECIPIENT_INVITES_PER_SEND,
  normalizeRecipientEmailList,
} from "@/lib/dataroom/vault-recipient-access";
import { cn } from "@/lib/utils";

function parseEmailTokens(raw: string): string[] {
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
  }
  return out;
}

function parseEmailList(raw: string): string[] {
  return parseEmailTokens(raw).slice(0, MAX_ALLOWED_RECIPIENT_EMAILS);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RoomShareAccessPanelProps = {
  effectiveShareUrl: string;
  restrictEnforced: boolean;
  onRestrictChange: (enabled: boolean) => void;
  isPending: boolean;
  peopleRows: PersonAccessRow[];
  onPeopleRowsChange: (next: PersonAccessRow[]) => void;
  peopleDirty: boolean;
  onSavePeople: () => Promise<void>;
  savedAllowedCount: number;
  slotsRemaining: number;
  inviteVaultPasswordReady: boolean;
  onSendInvites: (emails: string[]) => Promise<void>;
};

/**
 * Share surface: link, restricted toggle, simple people grid, invites.
 */
export function RoomShareAccessPanel({
  effectiveShareUrl,
  restrictEnforced,
  onRestrictChange,
  isPending,
  peopleRows,
  onPeopleRowsChange,
  peopleDirty,
  onSavePeople,
  savedAllowedCount,
  slotsRemaining,
  inviteVaultPasswordReady,
  onSendInvites,
}: RoomShareAccessPanelProps) {
  const [addEmailInput, setAddEmailInput] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteStaging, setInviteStaging] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkAllowed, setBulkAllowed] = useState("");
  const [bulkContributors, setBulkContributors] = useState("");

  const candidate = addEmailInput.trim().toLowerCase();
  const candidateValid = EMAIL_RE.test(candidate);
  const alreadyListed = candidateValid && peopleRows.some((r) => r.email === candidate);

  const addPerson = useCallback(
    (email: string, withUpload: boolean) => {
      const e = email.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) return;
      const next = normalizeRecipientEmailList([...peopleRows.map((r) => r.email), e]);
      if (next.length > MAX_ALLOWED_RECIPIENT_EMAILS) return;
      const contribSet = new Set(
        normalizeRecipientEmailList(peopleRows.filter((r) => r.canUpload).map((r) => r.email)),
      );
      if (withUpload) contribSet.add(e);
      else contribSet.delete(e);
      const rows: PersonAccessRow[] = next.sort().map((em) => ({
        email: em,
        canUpload: contribSet.has(em),
      }));
      onPeopleRowsChange(rows);
      setAddEmailInput("");
    },
    [peopleRows, onPeopleRowsChange],
  );

  const removePerson = useCallback(
    (email: string) => {
      onPeopleRowsChange(peopleRows.filter((r) => r.email !== email));
    },
    [peopleRows, onPeopleRowsChange],
  );

  const setUploadFor = useCallback(
    (email: string, enabled: boolean) => {
      onPeopleRowsChange(
        peopleRows.map((r) => (r.email === email ? { ...r, canUpload: enabled } : r)),
      );
    },
    [peopleRows, onPeopleRowsChange],
  );

  const openBulk = () => {
    const { allowed, contributors } = serverListsFromPeopleRows(peopleRows);
    setBulkAllowed(allowed.join("\n"));
    setBulkContributors(contributors.join("\n"));
    setShowBulkEdit(true);
  };

  const applyBulk = () => {
    onPeopleRowsChange(peopleRowsFromBulkLists(parseEmailList(bulkAllowed), parseEmailList(bulkContributors)));
    setShowBulkEdit(false);
  };

  const onAddKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter" && candidateValid && !alreadyListed) {
      ev.preventDefault();
      addPerson(candidate, false);
    }
  };

  const addInviteToStaging = useCallback(() => {
    const raw = inviteInput.trim();
    if (!raw) return;
    const found = parseEmailTokens(raw);
    const email = found[0];
    if (!email) return;
    setInviteStaging((prev) => {
      if (prev.includes(email)) return prev;
      if (prev.length >= MAX_RECIPIENT_INVITES_PER_SEND) return prev;
      return [...prev, email];
    });
    setInviteInput("");
  }, [inviteInput]);

  const inviteTooMany = inviteStaging.length > MAX_RECIPIENT_INVITES_PER_SEND;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-sm">
      <div className="border-b border-border/80 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              <Link2 className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Room link</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground sm:max-w-[min(100%,28rem)]">
                {shortenUrlForDisplay(effectiveShareUrl, 56)}
              </p>
            </div>
          </div>
          <CopyButton
            value={effectiveShareUrl}
            label="Copy link"
            variant="default"
            size="sm"
            className="h-10 w-full shrink-0 px-4 text-sm font-semibold sm:w-auto sm:min-w-[8.5rem] bg-[var(--color-accent)] text-white hover:opacity-95 hover:text-white"
            ariaLabel="Copy share link"
            title="Copy link"
          />
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Only listed emails</p>
            <p className="text-[10px] text-muted-foreground">Turn on to limit who can open the room.</p>
          </div>
          <Switch
            checked={restrictEnforced}
            disabled={isPending}
            onCheckedChange={onRestrictChange}
            aria-label="Only listed emails can open this room"
          />
        </div>

        <section className="space-y-3" aria-labelledby="people-access-heading">
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            <h3 id="people-access-heading" className="text-xs font-semibold text-foreground">
              Who can open this room
            </h3>
            <Badge variant="secondary" className="ml-auto text-[10px] font-normal tabular-nums">
              {savedAllowedCount} saved · {slotsRemaining} left
            </Badge>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            One row per email. Turn on <span className="font-medium text-foreground">Upload</span> if they may add
            encrypted files on the share page (not owner tools).
          </p>

          <div className="space-y-2">
            <FieldLabel htmlFor="add-person-email" className="text-[11px] text-muted-foreground">
              Add email
            </FieldLabel>
            <Input
              id="add-person-email"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={addEmailInput}
              onChange={(e) => setAddEmailInput(e.target.value)}
              onKeyDown={onAddKeyDown}
              className="h-10 text-sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 flex-1 sm:flex-none"
                disabled={!candidateValid || alreadyListed || isPending}
                onClick={() => addPerson(candidate, false)}
              >
                Add — view only
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-10 flex-1 bg-[var(--color-accent)] text-white hover:opacity-95 hover:text-white sm:flex-none"
                disabled={!candidateValid || alreadyListed || isPending}
                onClick={() => addPerson(candidate, true)}
              >
                Add — can upload
              </Button>
            </div>
            {alreadyListed && candidateValid ? (
              <p className="text-[10px] text-muted-foreground">Already in the list.</p>
            ) : null}
          </div>

          {peopleRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
              No one listed yet. Add an email above, then save.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                role="row"
              >
                <span>Email</span>
                <span className="text-center">Upload</span>
                <span className="sr-only">Remove</span>
              </div>
              <ul className="divide-y divide-border/60">
                {peopleRows.map((row) => (
                  <li
                    key={row.email}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5"
                    role="row"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12px] text-foreground" title={row.email}>
                        {row.email}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {row.canUpload ? "Opens room · may upload files" : "Opens room · view & download"}
                      </p>
                    </div>
                    <div className="flex justify-center px-1">
                      <Switch
                        checked={row.canUpload}
                        disabled={isPending}
                        onCheckedChange={(on) => setUploadFor(row.email, on)}
                        aria-label={`Allow uploads for ${row.email}`}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${row.email}`}
                        onClick={() => removePerson(row.email)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-[10px] font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => (showBulkEdit ? setShowBulkEdit(false) : openBulk())}
            >
              {showBulkEdit ? "Close bulk edit" : "Bulk edit (paste lists)"}
            </button>
            {showBulkEdit ? (
              <Button type="button" size="sm" variant="secondary" onClick={applyBulk}>
                Apply bulk lists
              </Button>
            ) : null}
          </div>
          {showBulkEdit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="gap-1">
                <FieldLabel className="text-[10px]">Access list (one per line or commas)</FieldLabel>
                <Textarea
                  className="min-h-[6rem] font-mono text-xs"
                  value={bulkAllowed}
                  onChange={(e) => setBulkAllowed(e.target.value)}
                  maxLength={8000}
                />
              </Field>
              <Field className="gap-1">
                <FieldLabel className="text-[10px]">Who can upload (subset of access list)</FieldLabel>
                <Textarea
                  className="min-h-[6rem] font-mono text-xs"
                  value={bulkContributors}
                  onChange={(e) => setBulkContributors(e.target.value)}
                  maxLength={8000}
                />
              </Field>
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            disabled={isPending || !peopleDirty}
            variant={peopleDirty ? "default" : "outline"}
            onClick={() => void onSavePeople()}
          >
            Save list
          </Button>
        </section>

        <section
          id="send-invites"
          className="scroll-mt-24 space-y-3 border-t border-border/60 pt-5"
          aria-labelledby="send-invites-heading"
        >
          <div className="flex items-center gap-2">
            <Send className="size-4 text-[var(--color-accent)]" aria-hidden />
            <h3 id="send-invites-heading" className="text-xs font-semibold text-foreground">
              Email invites
            </h3>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            We send the link and room password from this browser. Adds addresses to the list above and turns on{" "}
            <span className="font-medium text-foreground">only listed emails</span>.
          </p>
          {inviteStaging.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/15 p-2">
              {inviteStaging.map((e) => (
                <Badge key={e} variant="outline" className="gap-1 pr-1 font-mono text-[10px] font-normal">
                  {e}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    aria-label={`Remove ${e} from send list`}
                    onClick={() => setInviteStaging((s) => s.filter((x) => x !== e))}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="email"
              placeholder="Email to invite"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInviteToStaging();
                }
              }}
              className="h-10 text-sm"
            />
            <Button type="button" size="sm" variant="secondary" className="h-10 shrink-0" onClick={addInviteToStaging}>
              Add
            </Button>
          </div>
          {inviteTooMany ? (
            <p className="text-[10px] font-medium text-destructive">
              Max {MAX_RECIPIENT_INVITES_PER_SEND} per send — remove some or send in batches.
            </p>
          ) : null}
          {!inviteVaultPasswordReady ? (
            <p className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[11px] leading-snug text-amber-950 dark:text-amber-200">
              Open <strong>Room documents</strong> on the manage page and enter the room password here first (8+
              characters) so we can put it in the invite email.
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className={cn("w-full sm:w-auto", "bg-[var(--color-accent)] text-white hover:opacity-95")}
            disabled={isPending || inviteTooMany || inviteStaging.length === 0 || !inviteVaultPasswordReady}
            onClick={() => {
              void (async () => {
                try {
                  await onSendInvites(inviteStaging);
                  setInviteStaging([]);
                } catch {
                  /* parent surfaces error */
                }
              })();
            }}
          >
            <Send className="size-3.5" />
            Send {inviteStaging.length || ""} invite{inviteStaging.length === 1 ? "" : "s"}
          </Button>
        </section>
      </div>
    </div>
  );
}
