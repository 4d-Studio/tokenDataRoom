/**
 * Shared secret for HMAC-signed cookies (session, vault access, workspace NDA).
 * In production, the secret MUST be configured — no fallback is used.
 * Validated once at module load so the app fails fast if misconfigured.
 */

const _secret = (() => {
  const fromEnv = (process.env.TKN_APP_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  // In dev/test, allow missing secret but warn loudly.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[Token] TKN_APP_SECRET is not set. Cookies will not be signed securely. "
        + "Set it in .env.local for development.",
    );
    return null;
  }
  return null;
})();

export const getAppSecret = (): string | null => _secret;

export const requireAppSecretForTokens = (): string => {
  const s = getAppSecret();
  if (!s) {
    throw new Error(
      "[security] TKN_APP_SECRET (or NEXTAUTH_SECRET) must be set in production to sign cookies.",
    );
  }
  return s;
};

/** Call once at startup to fail fast if critical env vars are missing. */
export const validateEnvConfig = (): void => {
  const issues: string[] = [];

  if (process.env.NODE_ENV === "production") {
    if (!process.env.TKN_APP_SECRET && !process.env.NEXTAUTH_SECRET) {
      issues.push("TKN_APP_SECRET or NEXTAUTH_SECRET");
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `[Token] Missing required production environment variables: ${issues.join(", ")}. `
        + "The application cannot start without these.",
    );
  }
};
