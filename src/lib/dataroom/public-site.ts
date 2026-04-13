/**
 * Canonical public URL for metadata, Open Graph, sitemap, and JSON-LD.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://token.fyi).
 */
export const SITE_NAME = "Token.FYI";

export const SITE_DESCRIPTION =
  "Lightweight virtual data rooms for people who hate enterprise VDRs. Encrypt files in the browser, share one link, manage people and access in one place, optional NDA and in-room signing — at fair, published prices. Free to start.";

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
