/**
 * Extract client context from an incoming request: IP, geo, and device info.
 *
 * Geo data comes from CDN/proxy headers (Cloudflare, Vercel, Railway).
 * Device info is parsed from the User-Agent string using simple pattern matching
 * (no external dependency needed for basic browser + OS detection).
 */

// ─── IP ──────────────────────────────────────────────────────────────────────

export const getClientIp = (request: Request): string | undefined =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip") ??
  undefined;

// ─── Geo (from CDN headers) ──────────────────────────────────────────────────

export interface GeoInfo {
  city?: string;
  region?: string;
  country?: string;
}

/**
 * Extracts geolocation from standard CDN headers.
 *
 * Cloudflare:  cf-ipcountry, cf-ipcity, cf-ipregion (or cf-region)
 * Vercel:      x-vercel-ip-country, x-vercel-ip-city, x-vercel-ip-country-region
 * Fly.io:      fly-client-ip (IP only, no geo)
 *
 * Railway typically runs behind Cloudflare, so cf-* headers are available.
 */
export const getGeoInfo = (request: Request): GeoInfo => {
  const h = (name: string) => request.headers.get(name)?.trim() || undefined;

  const country =
    h("cf-ipcountry") ??
    h("x-vercel-ip-country") ??
    undefined;

  const city =
    h("cf-ipcity") ??
    h("x-vercel-ip-city") ??
    undefined;

  const region =
    h("cf-region") ??
    h("cf-ipregion") ??
    h("x-vercel-ip-country-region") ??
    undefined;

  return { city, region, country };
};

// ─── Device parsing (from User-Agent) ────────────────────────────────────────

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg(?:e|A)?\//, "Edge"],
  [/OPR\/|Opera\//, "Opera"],
  [/SamsungBrowser\//, "Samsung Browser"],
  [/UCBrowser\//, "UC Browser"],
  [/CriOS\//, "Chrome (iOS)"],
  [/FxiOS\//, "Firefox (iOS)"],
  [/Chrome\//, "Chrome"],
  [/Safari\/.*Version\//, "Safari"],
  [/Firefox\//, "Firefox"],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows NT 10/, "Windows"],
  [/Windows NT/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
  [/CrOS/, "ChromeOS"],
];

export const parseDevice = (userAgent: string | null | undefined): string | undefined => {
  if (!userAgent) return undefined;

  if (/bot|crawl|spider|slurp|headless/i.test(userAgent)) return "Bot";

  let browser = "Unknown browser";
  for (const [pattern, name] of BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      browser = name;
      break;
    }
  }

  let os = "";
  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(userAgent)) {
      os = name;
      break;
    }
  }

  return os ? `${browser} on ${os}` : browser;
};

// ─── Combined context ────────────────────────────────────────────────────────

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  city?: string;
  region?: string;
  country?: string;
}

/** Extract all available client context from a request in one call. */
export const getRequestContext = (request: Request): RequestContext => {
  const ua = request.headers.get("user-agent") ?? undefined;
  const geo = getGeoInfo(request);
  return {
    ipAddress: getClientIp(request),
    userAgent: ua,
    device: parseDevice(ua),
    ...geo,
  };
};
