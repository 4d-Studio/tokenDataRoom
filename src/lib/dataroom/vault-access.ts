import { timingSafeEqual } from "node:crypto";

/** Public share/manage slugs: `fm-` + 12 hex chars (see createPublicSlug). */
const VAULT_SLUG_PATTERN = /^fm-[0-9a-f]{12}$/;

export const isValidPublicVaultSlug = (slug: string): boolean =>
  typeof slug === "string" && VAULT_SLUG_PATTERN.test(slug);

/**
 * Constant-time comparison for owner keys (capability tokens in URLs).
 * Avoids leaking key material via short-circuit string compare.
 */
export const verifyOwnerKey = (
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean => {
  if (!provided || !expected || typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
