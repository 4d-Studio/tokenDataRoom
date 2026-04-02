/**
 * Per-tab / per-browser-session UUID for vault recipient access.
 * Sent when signing the NDA and stored in an httpOnly cookie alongside the signed access token,
 * so a leaked token string alone cannot fetch the bundle without this browser's cookies.
 */
const storageKey = (slug: string) => `tkn_viewer_bind_${slug}`;

const memoryFallback = new Map<string, string>();

export function getOrCreateViewerBinding(slug: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const k = storageKey(slug);
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    let v = memoryFallback.get(slug);
    if (!v) {
      v = crypto.randomUUID();
      memoryFallback.set(slug, v);
    }
    return v;
  }
}
