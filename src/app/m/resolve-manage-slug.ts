import type { VaultRecord } from "@/lib/dataroom/types";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";
import { resolveVanitySlug } from "@/lib/dataroom/vanity-slugs";

export async function resolveManageRoomSlug(urlSlug: string): Promise<string | null> {
  if (isValidPublicVaultSlug(urlSlug)) return urlSlug;
  return resolveVanitySlug(urlSlug);
}

/** Canonical `fm-*` slug + vault row when the owner key matches. */
export async function loadManageRoomForOwner(
  rawSlug: string,
  key: string | undefined,
): Promise<{ slug: string; metadata: VaultRecord } | null> {
  const slug = await resolveManageRoomSlug(rawSlug);
  if (!slug) return null;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);
  if (!metadata || !verifyOwnerKey(key, metadata.ownerKey)) {
    return null;
  }
  return { slug, metadata };
}
