import { createHmac, timingSafeEqual } from "node:crypto";

import { getAppSecret, requireAppSecretForTokens } from "@/lib/dataroom/app-secret";
import type { VaultAcceptanceRecord } from "@/lib/dataroom/types";

const COOKIE_PREFIX = "tkn_access_";
const BINDING_COOKIE_PREFIX = "tkn_vbind_";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AccessPayload = {
  slug: string;
  acceptanceId: string;
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
  signerAddress: string;
  signatureName: string;
  ndaVersion: string;
  acceptedAt: string;
  /** When set, requests must also send matching httpOnly cookie (vaultViewerBindingCookieName). */
  viewerBinding?: string;
};

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signWithSecret = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export const accessCookieName = (slug: string) => `${COOKIE_PREFIX}${slug}`;

export const vaultViewerBindingCookieName = (slug: string) => `${BINDING_COOKIE_PREFIX}${slug}`;

const verifyViewerBindingPair = (inToken: string, fromCookie: string | undefined): boolean => {
  if (!fromCookie) {
    return false;
  }
  try {
    const a = Buffer.from(inToken, "utf8");
    const b = Buffer.from(fromCookie, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

export const createAccessToken = (payload: AccessPayload) => {
  const secret = requireAppSecretForTokens();
  const body = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
};

export const verifyAccessToken = (
  token: string | undefined,
  slug: string,
  viewerBindingCookie?: string | undefined,
) => {
  if (!token) {
    return null;
  }

  const secret = getAppSecret();
  if (!secret) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = signWithSecret(secret, body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(body)) as AccessPayload;

    if (payload.slug !== slug) {
      return null;
    }

    if (
      typeof payload.viewerBinding === "string" &&
      payload.viewerBinding.length > 0 &&
      !verifyViewerBindingPair(payload.viewerBinding, viewerBindingCookie)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

type CookieGetter = { get(name: string): { value: string } | undefined };

export const readVaultAccessFromCookies = (cookieStore: CookieGetter, slug: string) =>
  verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
    cookieStore.get(vaultViewerBindingCookieName(slug))?.value,
  );

export const accessCookieOptions = {
  httpOnly: true,
  maxAge: ACCESS_TOKEN_TTL_SECONDS,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const vaultViewerBindingCookieOptions = {
  httpOnly: true,
  maxAge: ACCESS_TOKEN_TTL_SECONDS,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const vaultAcceptanceToAccessPayload = (
  slug: string,
  acceptance: VaultAcceptanceRecord,
): AccessPayload => ({
  slug,
  acceptanceId: acceptance.id,
  signerName: acceptance.signerName,
  signerEmail: acceptance.signerEmail,
  signerCompany: acceptance.signerCompany,
  signerAddress: acceptance.signerAddress,
  signatureName: acceptance.signatureName,
  ndaVersion: acceptance.ndaVersion,
  acceptedAt: acceptance.acceptedAt,
});
