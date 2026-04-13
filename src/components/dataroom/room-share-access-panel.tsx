"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link2, Send, Upload, UserRound, X } from "lucide-react";

import { CopyButton } from "@/components/dataroom/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
 * Share surface: link, restricted toggle, people table, add flow with keyboard-friendly access picker, invites.
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHighlight, setPickerHighlight] = useState<0 | 1>(0);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteStaging, setInviteStaging] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkAllowed, setBulkAllowed] = useState("");
  const [bulkContributors, setBulkContributors] = useState("");
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const option0Ref = useRef<HTMLButtonElement>(null);
  const option1Ref = useRef<HTMLButtonElement>(null);

  const candidate = addEmailInput.trim().toLowerCase();
  const candidateValid = EMAIL_RE.test(candidate);
  const alreadyListed = candidateValid && peopleRows.some((r) => r.email === candidate);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    (pickerHighlight === 0 ? option0Ref : option1Ref).current?.focus();
  }, [pickerOpen, pickerHighlight]);

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
      setPickerOpen(false);
      setPickerHighlight(0);
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
    if (ev.key === "Escape") {
      setPickerOpen(false);
      return;
    }
    if (!pickerOpen || !candidateValid || alreadyListed) {
      if (ev.key === "Enter" && candidateValid && !alreadyListed) {
        ev.preventDefault();
        setPickerOpen(true);
        setPickerHighlight(0);
      }
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setPickerHighlight((h) => (h === 0 ? 1 : 0));
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setPickerHighlight((h) => (h === 0 ? 1 : 0));
      return;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      addPerson(candidate, pickerHighlight === 1);
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
  const listboxId = useId();

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-sm">
      <div className="border-b border-border/80 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <Link2 className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold text-foreground">Share link</p>
            <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">
              {shortenUrlForDisplay(effectiveShareUrl, 72)}
            </p>
            <CopyButton
              value={effectiveShareUrl}
              label="Copy link"
              variant="default"
              size="sm"
              className="h-8"
              ariaLabel="Copy share link"
              title="Copy link"
            />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Restricted access</p>
            <p className="text-[10px] text-muted-foreground">Only listed people can open this room.</p>
          </div>
          <Switch
            checked={restrictEnforced}
            disabled={isPending}
            onCheckedChange={onRestrictChange}
            aria-label="Restrict to invited emails only"
          />
        </div>

        <section className="space-y-3" aria-labelledby="people-access-heading">
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            <h3 id="people-access-heading" className="text-xs font-semibold text-foreground">
              People & access
            </h3>
            <Badge variant="secondary" className="ml-auto text-[10px] font-normal tabular-nums">
              {savedAllowedCount} saved · {slotsRemaining} left
            </Badge>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Room access</strong> means verify email, complete any NDA,
            unlock with the room password, and view or download files. <strong className="font-medium text-foreground">Can upload files</strong> adds encrypted uploads on the share page only — it does not grant owner tools, signing admin, or
            revoke/delete.
          </p>

          <div ref={pickerWrapRef} className="relative space-y-1.5">
            <FieldLabel htmlFor="add-person-email" className="text-[11px] text-muted-foreground">
              Add someone by email
            </FieldLabel>
            <Input
              id="add-person-email"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={addEmailInput}
              onChange={(e) => {
                setAddEmailInput(e.target.value);
                const v = e.target.value.trim().toLowerCase();
                setPickerOpen(EMAIL_RE.test(v) && !peopleRows.some((r) => r.email === v));
                setPickerHighlight(0);
              }}
              onFocus={() => {
                if (candidateValid && !alreadyListed) setPickerOpen(true);
              }}
              onKeyDown={onAddKeyDown}
              role="combobox"
              aria-expanded={pickerOpen}
              aria-controls={pickerOpen ? listboxId : undefined}
              aria-autocomplete="list"
              className="h-9 text-sm"
            />
            {pickerOpen && candidateValid && !alreadyListed ? (
              <div
                id={listboxId}
                role="listbox"
                aria-label="Choose access level"
                className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-md sm:max-w-md"
              >
                <button
                  ref={option0Ref}
                  type="button"
                  role="option"
                  aria-selected={pickerHighlight === 0}
                  className={cn(
                    "flex w-full items-start gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm outline-none",
                    pickerHighlight === 0 ? "bg-muted/90" : "hover:bg-muted/80",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setPickerHighlight(0)}
                  onClick={() => addPerson(candidate, false)}
                >
                  <span className="mt-0.5 font-medium text-foreground">Room access only</span>
                  <span className="ml-auto shrink-0 rounded border border-border/80 bg-muted/40 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                    View
                  </span>
                </button>
                <button
                  ref={option1Ref}
                  type="button"
                  role="option"
                  aria-selected={pickerHighlight === 1}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm outline-none",
                    pickerHighlight === 1 ? "bg-muted/90" : "hover:bg-muted/80",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setPickerHighlight(1)}
                  onClick={() => addPerson(candidate, true)}
                >
                  <span className="mt-0.5 font-medium text-foreground">Room access + can upload files</span>
                  <span className="ml-auto flex shrink-0 gap-1">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      View
                    </Badge>
                    <Badge variant="default" className="text-[10px] font-normal">
                      Upload
                    </Badge>
                  </span>
                </button>
                <p className="border-t border-border/50 px-3 py-1.5 text-[9px] text-muted-foreground">
                  ↑↓ to move · Enter to choose · Esc to close
                </p>
              </div>
            ) : null}
            {alreadyListed && candidateValid ? (
              <p className="text-[10px] text-muted-foreground">This address is already in the table.</p>
            ) : null}
          </div>

          {peopleRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
              No people yet. Type an email and choose an access level.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground">Access</TableHead>
                    <TableHead className="w-[120px] text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                      Can upload files
                    </TableHead>
                    <TableHead className="w-12 pr-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                      {""}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peopleRows.map((row) => (
                    <TableRow key={row.email} className="text-[11px]">
                      <TableCell className="max-w-[min(100%,14rem)] font-mono text-foreground sm:max-w-[20rem]">
                        <span className="block truncate" title={row.email}>
                          {row.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            Room access
                          </Badge>
                          {row.canUpload ? (
                            <Badge variant="default" className="gap-0.5 text-[10px] font-normal">
                              <Upload className="size-2.5 opacity-90" aria-hidden />
                              Upload
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={row.canUpload}
                          disabled={isPending}
                          onCheckedChange={(on) => setUploadFor(row.email, on)}
                          aria-label={`Allow ${row.email} to upload encrypted files`}
                        />
                      </TableCell>
                      <TableCell className="pr-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${row.email}`}
                          onClick={() => removePerson(row.email)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            Save people
          </Button>
        </section>

        <section className="space-y-3 border-t border-border/60 pt-5" aria-labelledby="send-invites-heading">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-[var(--color-accent)]" aria-hidden />
            <h3 id="send-invites-heading" className="text-xs font-semibold text-foreground">
              Send invites
            </h3>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            We email the share link and the room password from this browser session (never stored on our servers). Adds
            people to the access list and turns on restricted access.
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
              placeholder="Add email, then Add to list"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInviteToStaging();
                }
              }}
              className="h-9 text-sm"
            />
            <Button type="button" size="sm" variant="secondary" onClick={addInviteToStaging}>
              Add to send list
            </Button>
          </div>
          {inviteTooMany ? (
            <p className="text-[10px] font-medium text-destructive">
              Max {MAX_RECIPIENT_INVITES_PER_SEND} per send — remove some or send in batches.
            </p>
          ) : null}
          {!inviteVaultPasswordReady ? (
            <p className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[10px] leading-snug text-amber-950 dark:text-amber-200">
              Enter the room password under <strong>Room documents</strong> first (8+ characters) so invite emails can
              include it from this device.
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
