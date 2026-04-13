/**
 * Canonical public URL for metadata, Open Graph, sitemap, and JSON-LD.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://token.fyi).
 */
export const SITE_NAME = "Token.FYI";

export const SITE_DESCRIPTION =
  "Share sensitive files with outsiders—not your whole drive. Encrypted rooms, optional NDA, document signing, password links, and a clear activity trail. Free to start; Personal and Pro on the pricing page.";

const DEFAULT_PUBLIC_ORIGIN = "https://token.fyi";

/** Origin only, no trailing slash (e.g. https://token.fyi). */
export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw).origin;
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

/** Full URL object for Next.js metadataBase. */
export function getPublicSiteUrl(): URL {
  return new URL(getPublicSiteOrigin());
}
