import { createHmac, timingSafeEqual } from "node:crypto";

import { getAppSecret, requireAppSecretForTokens } from "@/lib/dataroom/app-secret";

export type SigningInvitePayload = {
  slug: string;
  requestId: string;
  signerId: string;
};

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signWithSecret = (secret: string, body: string) =>
  createHmac("sha256", secret).update(body).digest("base64url");

/** ~60 days — long enough for diligence; owner can void and recreate if needed. */
export const SIGNING_INVITE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

export const createSigningInviteToken = (payload: SigningInvitePayload) => {
  const secret = requireAppSecretForTokens();
  const body = encode(
    JSON.stringify({
      ...payload,
      issuedAt: Date.now(),
    }),
  );
  const signature = signWithSecret(secret, body);
  return `${body}.${signature}`;
};

export const verifySigningInviteToken = (
  token: string | undefined,
  slug: string,
  requestId: string,
): SigningInvitePayload | null => {
  if (!token) return null;

  const secret = getAppSecret();
  if (!secret) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

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
    const parsed = JSON.parse(decode(body)) as SigningInvitePayload & { issuedAt?: number };
    if (parsed.slug !== slug || parsed.requestId !== requestId) return null;
    if (typeof parsed.issuedAt !== "number") return null;
    if (Date.now() - parsed.issuedAt > SIGNING_INVITE_MAX_AGE_MS) return null;
    return {
      slug: parsed.slug,
      requestId: parsed.requestId,
      signerId: parsed.signerId,
    };
  } catch {
    return null;
  }
};
