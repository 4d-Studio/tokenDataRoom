/**
 * Session-only cache of the room encryption password on the owner's browser.
 * Used for file preview and for including the same password in invite emails.
 * Never stored server-side.
 */
export function ownerVaultPasswordSessionKey(slug: string): string {
  return `tkn_vault_pw_${slug}`;
}
