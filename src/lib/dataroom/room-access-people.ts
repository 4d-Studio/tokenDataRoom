import type { VaultRecord } from "@/lib/dataroom/types";
import { normalizeRecipientEmailList } from "@/lib/dataroom/vault-recipient-access";

/** One invited person on the manage-room access table. */
export type PersonAccessRow = {
  email: string;
  canUpload: boolean;
};

function sortedEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

/** Build rows from saved server lists (union of allowed + contributors). */
export function peopleRowsFromServer(
  metadata: Pick<VaultRecord, "allowedRecipientEmails" | "contributorRecipientEmails">,
): PersonAccessRow[] {
  const allowed = normalizeRecipientEmailList(metadata.allowedRecipientEmails ?? []);
  const contribSet = new Set(normalizeRecipientEmailList(metadata.contributorRecipientEmails ?? []));
  const all = new Set<string>([...allowed, ...contribSet]);
  return [...all].sort().map((email) => ({
    email,
    canUpload: contribSet.has(email),
  }));
}

/** Split table rows into API payloads (every row is on the access list; upload is a subset). */
export function serverListsFromPeopleRows(rows: PersonAccessRow[]): {
  allowed: string[];
  contributors: string[];
} {
  const allowed = normalizeRecipientEmailList(rows.map((r) => r.email));
  const contributors = normalizeRecipientEmailList(
    rows.filter((r) => r.canUpload).map((r) => r.email),
  );
  return { allowed, contributors };
}

export function peopleRowsEqualServer(
  rows: PersonAccessRow[],
  metadata: Pick<VaultRecord, "allowedRecipientEmails" | "contributorRecipientEmails">,
): boolean {
  const { allowed, contributors } = serverListsFromPeopleRows(rows);
  const sa = normalizeRecipientEmailList(metadata.allowedRecipientEmails ?? []);
  const sc = normalizeRecipientEmailList(metadata.contributorRecipientEmails ?? []);
  return sortedEqual(allowed, sa) && sortedEqual(contributors, sc);
}

/** Merge parsed bulk lists into rows (contributors must be subset of allowed for UI; server clamps too). */
export function peopleRowsFromBulkLists(allowedRaw: string[], contributorRaw: string[]): PersonAccessRow[] {
  const allowed = normalizeRecipientEmailList(allowedRaw);
  const contribSet = new Set(normalizeRecipientEmailList(contributorRaw));
  return [...allowed].sort().map((email) => ({
    email,
    canUpload: contribSet.has(email),
  }));
}
