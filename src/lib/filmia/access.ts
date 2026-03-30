import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "filmia_access_";
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
};

const getSecret = () =>
  process.env.FILMIA_APP_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "filmia-local-development-secret";

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string) =>
  createHmac("sha256", getSecret()).update(value).digest("base64url");

export const accessCookieName = (slug: string) => `${COOKIE_PREFIX}${slug}`;

export const createAccessToken = (payload: AccessPayload) => {
  const body = encode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
};

export const verifyAccessToken = (token: string | undefined, slug: string) => {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);
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

    return payload;
  } catch {
    return null;
  }
};

export const accessCookieOptions = {
  httpOnly: true,
  maxAge: ACCESS_TOKEN_TTL_SECONDS,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};
