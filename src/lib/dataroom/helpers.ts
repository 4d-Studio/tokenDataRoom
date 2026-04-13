import { DEFAULT_EXPIRATION_DAYS } from "@/lib/dataroom/types";

/** Labels substituted into the default mutual NDA (new room wizard). */
export type DefaultNdaPartyLabels = {
  disclosingParty: string;
  receivingParty: string;
};

const DEFAULT_RECEIVING_ROLE = `the reviewing party identified in the Token.FYI acceptance record below (the "Reviewer")`;

function partyOrFallback(raw: string | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  return t.length >= 2 ? t : fallback;
}

/**
 * Builds the standard mutual NDA body.
 * - Pass `{ disclosingParty, receivingParty }` for new rooms (both should be filled).
 * - Pass a string for legacy use: treated as the disclosing party only; receiving role uses the standard Reviewer clause.
 * - Omit arguments for a generic placeholder draft (workspace settings preview, etc.).
 */
export function buildDefaultNdaText(opts?: string | DefaultNdaPartyLabels | null): string {
  let disclosing: string;
  let receiving: string;
  if (typeof opts === "string") {
    disclosing = partyOrFallback(opts, "The disclosing party");
    receiving = DEFAULT_RECEIVING_ROLE;
  } else if (opts && typeof opts === "object" && "disclosingParty" in opts) {
    disclosing = partyOrFallback(opts.disclosingParty, "The disclosing party");
    receiving = partyOrFallback(opts.receivingParty, DEFAULT_RECEIVING_ROLE);
  } else {
    disclosing = "The disclosing party";
    receiving = DEFAULT_RECEIVING_ROLE;
  }

  return `${disclosing}
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into by and between ${disclosing} and ${receiving}. Each may be referred to individually as a "Party" and collectively as the "Parties." The Parties wish to explore a potential business opportunity of mutual interest (the "Opportunity") and exchange confidential information in connection with that Opportunity.

"Confidential Information" means any non-public information disclosed by one Party (the "Discloser") to the other Party (the "Recipient"), whether directly or indirectly, that is marked confidential or should reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information does not include information that: (i) is or becomes publicly available without breach of this Agreement; (ii) was already in the Recipient's lawful possession without restriction before disclosure; or (iii) is lawfully obtained from a third party without breach of any duty of confidentiality.

The Recipient will: (a) use the Confidential Information solely to evaluate the Opportunity; (b) restrict disclosure of Confidential Information to employees, agents, attorneys, accountants, financing sources, and other representatives who need to know it for the Opportunity and who are bound by confidentiality obligations at least as protective as those in this Agreement; and (c) protect the Confidential Information using reasonable care, and no less than the care used to protect its own confidential information of similar importance. The Recipient will promptly notify the Discloser of any unauthorized use or disclosure of Confidential Information of which it becomes aware.

The Recipient may disclose Confidential Information only if legally compelled to do so, and then only after giving the Discloser prompt written notice, if legally permitted, so the Discloser may seek a protective order or other appropriate remedy. All documents, files, materials, and other tangible embodiments of Confidential Information remain the property of the Discloser and must be returned or destroyed promptly upon written request, together with certification of destruction if requested.

All Confidential Information is provided "AS IS" without warranty of any kind. Nothing in this Agreement grants the Recipient any license or other rights under any patent, copyright, trademark, trade secret, or other intellectual property right of the Discloser except the limited right to review the Confidential Information for the Opportunity. The Recipient acknowledges that unauthorized use or disclosure of Confidential Information may cause irreparable harm, and the Discloser is entitled to seek injunctive relief in addition to any other remedies available at law or in equity.

This Agreement starts on the date the Reviewer accepts it electronically in Token.FYI and continues for one (1) year. The Recipient's confidentiality obligations continue for three (3) years after termination of this Agreement, except for trade secrets, which must be protected for so long as they remain trade secrets under applicable law. Nothing in this Agreement obligates either Party to proceed with any transaction or relationship.

This Agreement is the complete agreement between the Parties concerning the subject matter above and may be modified only in a signed writing by both Parties. If any provision is held unenforceable, the remaining provisions will remain in full force and effect. This Agreement is governed by the laws of the State of California, without regard to conflicts of law rules, and the Parties consent to the exclusive jurisdiction of the state and federal courts located in San Francisco, California.

By accepting this Agreement in Token.FYI, the Reviewer represents that the signer is authorized to bind the reviewing party identified in the acceptance record and agrees that electronic acceptance and electronic delivery of a signed copy of this Agreement are legally effective.`;
}

export const DEFAULT_NDA_TEXT = buildDefaultNdaText();

export const createPublicSlug = () =>
  `fm-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export const createOwnerKey = () =>
  crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

export const addDays = (days: number = DEFAULT_EXPIRATION_DAYS) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const isVaultExpired = (expiresAt: string) =>
  Date.now() > new Date(expiresAt).getTime();

export const formatBytes = (value: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const getBaseUrlFromHeaders = (headerMap: { get(name: string): string | null }) => {
  const host = headerMap.get("x-forwarded-host") ?? headerMap.get("host") ?? "localhost:3000";
  const protocol =
    headerMap.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
};

function isBogusPublicHostname(hostname: string): boolean {
  return hostname === "0.0.0.0" || hostname === "[::]" || hostname.length === 0;
}

function localDevPublicBaseUrl(request: Request): string {
  try {
    const u = new URL(request.url);
    if (u.hostname === "0.0.0.0") {
      return `http://localhost:${u.port || "3000"}`;
    }
    if (!isBogusPublicHostname(u.hostname)) return u.origin;
  } catch {
    /* */
  }

  const fromHeaders = getBaseUrlFromHeaders(request.headers);
  try {
    const u = new URL(fromHeaders);
    if (u.hostname === "0.0.0.0") {
      return `http://localhost:${u.port || "3000"}`;
    }
    if (!isBogusPublicHostname(u.hostname)) return fromHeaders;
  } catch {
    /* */
  }

  return "http://localhost:3000";
}

/**
 * Public origin for share/manage links from API routes.
 *
 * - **`next dev`** (`NODE_ENV === "development"`): uses the host you’re actually hitting
 *   (localhost, etc.). Ignores `NEXT_PUBLIC_SITE_URL` / `RAILWAY_PUBLIC_DOMAIN` so local
 *   links stay local.
 * - **Production** (and **`vitest`**, `NODE_ENV === "test"`): `NEXT_PUBLIC_SITE_URL` /
 *   `SITE_URL` → `RAILWAY_PUBLIC_DOMAIN` → proxy headers — avoids `0.0.0.0:8080` behind Railway.
 */
export function getPublicAppBaseUrl(request: Request): string {
  if (process.env.NODE_ENV === "development") {
    return localDevPublicBaseUrl(request);
  }

  const trimSlash = (s: string) => (s.endsWith("/") ? s.slice(0, -1) : s);

  for (const key of ["NEXT_PUBLIC_SITE_URL", "SITE_URL"] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      const normalized = trimSlash(raw);
      const withProto = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
      const u = new URL(withProto);
      if (u.protocol === "http:" || u.protocol === "https:") return u.origin;
    } catch {
      /* invalid */
    }
  }

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    const hostOnly = railway.replace(/^https?:\/\//i, "").split("/")[0]?.trim() ?? "";
    if (hostOnly && !isBogusPublicHostname(hostOnly)) {
      return `https://${hostOnly}`;
    }
  }

  const fromHeaders = getBaseUrlFromHeaders(request.headers);
  try {
    const u = new URL(fromHeaders);
    if (!isBogusPublicHostname(u.hostname)) return fromHeaders;
  } catch {
    /* */
  }

  try {
    const u = new URL(request.url);
    if (!isBogusPublicHostname(u.hostname)) return u.origin;
  } catch {
    /* */
  }

  return "http://localhost:3000";
}

/**
 * Compact single-line URL preview for UI. The full string is still used when copying.
 * Prefers `host + path` and inserts a middle ellipsis when over `maxChars`.
 */
export function shortenUrlForDisplay(url: string, maxChars = 44): string {
  const s = url.trim();
  if (s.length <= maxChars) return s;
  try {
    const u = new URL(s);
    const path = `${u.pathname}${u.search}` || "/";
    const core = `${u.host}${path}`;
    if (core.length <= maxChars) return core;
    const inner = maxChars - 1;
    const left = Math.max(8, Math.floor(inner * 0.45));
    const right = inner - left;
    if (left + right >= core.length) return `${core.slice(0, inner)}…`;
    return `${core.slice(0, left)}…${core.slice(-right)}`;
  } catch {
    const budget = maxChars - 1;
    const half = Math.floor(budget / 2);
    return `${s.slice(0, half)}…${s.slice(-(budget - half))}`;
  }
}

/** Turn owner-entered Telegram text into an https URL for links, or null if not linkable. */
/** Preview hostname for owner-entered https URLs; empty input is valid. */
export function httpsUrlPreview(
  raw: string,
): { ok: true; hostname: string } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true, hostname: "" };
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") {
      return { ok: false, message: "Link must start with https://" };
    }
    return { ok: true, hostname: u.hostname };
  } catch {
    return { ok: false, message: "Enter a valid https URL" };
  }
}

export function telegramProfileUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const h = t.replace(/^@+/, "").replace(/^t\.me\//i, "");
  if (!/^[a-zA-Z0-9_]{4,64}$/.test(h)) return null;
  return `https://t.me/${h}`;
}

export const getClientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip") ??
  undefined;

/**
 * Strip characters that can break Content-Disposition or inject response headers.
 * Keeps a readable basename; falls back if nothing safe remains.
 */
export const toAsciiDispositionBasename = (name: string, maxLen = 120): string => {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\\r\n\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, maxLen)
    .replace(/^\.+/, "");
  return cleaned.length > 0 ? cleaned : "document";
};
