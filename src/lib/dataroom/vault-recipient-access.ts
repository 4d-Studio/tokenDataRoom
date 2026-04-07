import type { VaultAcceptanceRecord, VaultRecord } from "@/lib/dataroom/types";

/** Stored on acceptance records created after email OTP when the room has no NDA. */
export const EMAIL_GATE_NDA_VERSION = "tkn-email-verified-v1";

const MAX_ALLOWED_RECIPIENT_EMAILS = 100;

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
