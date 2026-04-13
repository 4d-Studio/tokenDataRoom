import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/dataroom/types";

export type RecipientVaultAccessRole = "viewer" | "contributor";

/** Stored on acceptance records created after email OTP when the room has no NDA. */
export const EMAIL_GATE_NDA_VERSION = "tkn-email-verified-v1";

/** Allowed-address cap stored on room metadata. */
export const MAX_ALLOWED_RECIPIENT_EMAILS = 100;

/** Owner API accepts at most this many addresses per `send_recipient_invites` call. */
export const MAX_RECIPIENT_INVITES_PER_SEND = 25;

export function normalizeRecipientEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeRecipientEmailList(emails: string[]): string[] {
  const set = new Set<string>();
  for (const e of emails) {
    const n = normalizeRecipientEmail(e);
    if (n.includes("@")) set.add(n);
  }
  return [...set].sort();
}

export function isRecipientEmailAllowed(metadata: VaultRecord, email: string): boolean {
  if (!metadata.restrictRecipientEmails) return true;
  const norm = normalizeRecipientEmail(email);
  const list = metadata.allowedRecipientEmails ?? [];
  return list.some((e) => normalizeRecipientEmail(e) === norm);
}

/** Normalized contributor list from room metadata. */
export function contributorRecipientEmailSet(metadata: VaultRecord): Set<string> {
  return new Set(normalizeRecipientEmailList(metadata.contributorRecipientEmails ?? []));
}

/**
 * Whether this address may upload on the share page. Always false when not on the contributor list.
 * When invite-only is on, the address must also be allowed to access the room.
 */
export function recipientVaultAccessRoleForEmail(
  metadata: VaultRecord,
  email: string,
): RecipientVaultAccessRole {
  const norm = normalizeRecipientEmail(email);
  if (!contributorRecipientEmailSet(metadata).has(norm)) {
    return "viewer";
  }
  if (metadata.restrictRecipientEmails && !isRecipientEmailAllowed(metadata, norm)) {
    return "viewer";
  }
  return "contributor";
}

/** Clamp contributor emails to caps and, when invite-only, to the allowed list. */
export function clampContributorRecipientEmails(
  contributors: string[],
  metadata: VaultRecord,
): string[] {
  const norm = normalizeRecipientEmailList(contributors);
  if (metadata.restrictRecipientEmails) {
    const allowed = new Set(normalizeRecipientEmailList(metadata.allowedRecipientEmails ?? []));
    return norm.filter((e) => allowed.has(e)).slice(0, MAX_ALLOWED_RECIPIENT_EMAILS);
  }
  return norm.slice(0, MAX_ALLOWED_RECIPIENT_EMAILS);
}

export function isEmailGateOnlyAcceptance(a: VaultAcceptanceRecord): boolean {
  return a.ndaVersion === EMAIL_GATE_NDA_VERSION;
}

export function clampRecipientEmailList(emails: string[]): string[] {
  return normalizeRecipientEmailList(emails).slice(0, MAX_ALLOWED_RECIPIENT_EMAILS);
}

export const recipientAccessError = {
  notInvited:
    "This room only accepts invited email addresses. Use the same address the organizer added, or ask them to invite you.",
  listEmpty:
    "This room is invite-only, but no addresses have been added yet. Ask the organizer to finish setup.",
} as const;
