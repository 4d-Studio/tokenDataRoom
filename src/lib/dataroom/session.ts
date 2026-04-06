import { createHmac, timingSafeEqual } from "node:crypto";

import { getAppSecret, requireAppSecretForTokens, validateEnvConfig } from "@/lib/dataroom/app-secret";

// Fail fast at startup if env is misconfigured
validateEnvConfig();

export type UserSession = {
  userId: string;
  email: string;
};

const SESSION_COOKIE_NAME = "tkn_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");

export const sessionCookieName = SESSION_COOKIE_NAME;

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: SESSION_TTL_SECONDS,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const createSessionToken = (payload: UserSession) => {
  const secret = requireAppSecretForTokens();
  const body = encode(JSON.stringify(payload));
  return `${body}.${sign(secret, body)}`;
};

export const verifySessionToken = (token: string | undefined) => {
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

  const expected = sign(secret, body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(decode(body)) as UserSession;
  } catch {
    return null;
  }
};
