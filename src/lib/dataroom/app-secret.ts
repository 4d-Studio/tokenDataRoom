/**
 * Shared secret for HMAC-signed cookies (session, vault access, workspace NDA).
 * In production, missing config means tokens cannot be issued or verified safely.
 */
const LOCAL_DEV_FALLBACK = "token-local-dev-secret";

export const getAppSecret = (): string | null => {
  const fromEnv = (process.env.TKN_APP_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return LOCAL_DEV_FALLBACK;
};

export const requireAppSecretForTokens = (): string => {
  const s = getAppSecret();
  if (!s) {
    throw new Error(
      "[security] TKN_APP_SECRET (or NEXTAUTH_SECRET) must be set in production to sign cookies.",
    );
  }
  return s;
};
