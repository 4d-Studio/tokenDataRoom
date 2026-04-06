/**
 * Recipient account management: persistent identity for NDA-signed viewers.
 *
 * Schema: tkn_recipient_accounts (email, verified_at, last_login)
 *          tkn_recipient_codes   (email, code_hash, expires_at, used_at, slug)
 *
 * Falls back to in-memory store when DATABASE_URL is not configured.
 */
import { createHash, randomUUID } from "node:crypto";

import { getPgPool, isPostgresAuthConfigured } from "@/lib/dataroom/postgres-auth-state";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecipientAccount = {
  id: string;
  email: string;
  createdAt: string;
  verifiedAt: string | null;
  lastLogin: string | null;
};

export type RecipientLoginCodeRecord = {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
  slug: string;
};

// ─── Fallback in-memory store (dev / no DB) ───────────────────────────────────

const inMemoryAccounts = new Map<string, RecipientAccount>();
const inMemoryCodes: RecipientLoginCodeRecord[] = [];

const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

const now = () => new Date().toISOString();

// ─── Database helpers ──────────────────────────────────────────────────────────

const TABLE_ACCOUNTS = "tkn_recipient_accounts";
const TABLE_CODES = "tkn_recipient_codes";

async function pgQuery(sql: string, params: unknown[]) {
  const pool = getPgPool();
  return pool.query(sql, params);
}

// ─── Account operations ────────────────────────────────────────────────────────

/** Find a recipient account by email. Returns null if not found or DB not configured. */
export const getRecipientAccountByEmail = async (
  email: string,
): Promise<RecipientAccount | null> => {
  const normalized = email.trim().toLowerCase();

  if (!isPostgresAuthConfigured()) {
    return (inMemoryAccounts.get(normalized)) ?? null;
  }

  const result = await pgQuery(
    `SELECT id, email, created_at AS "createdAt",
            verified_at AS "verifiedAt", last_login AS "lastLogin"
     FROM ${TABLE_ACCOUNTS} WHERE email = $1`,
    [normalized],
  );

  return (result.rows[0] as RecipientAccount) ?? null;
};

/**
 * Get or create a RecipientAccount for an email.
 * If the account doesn't exist it is created (unverified).
 * If it exists the last_login is updated.
 */
export const getOrCreateRecipientAccount = async (
  email: string,
): Promise<RecipientAccount> => {
  const normalized = email.trim().toLowerCase();
  const ts = now();

  if (!isPostgresAuthConfigured()) {
    const existing = inMemoryAccounts.get(normalized);
    if (existing) {
      const updated: RecipientAccount = { ...existing, lastLogin: ts };
      inMemoryAccounts.set(normalized, updated);
      return updated;
    }
    const account: RecipientAccount = {
      id: randomUUID(),
      email: normalized,
      createdAt: ts,
      verifiedAt: null,
      lastLogin: ts,
    };
    inMemoryAccounts.set(normalized, account);
    return account;
  }

  // Upsert: INSERT ON CONFLICT updates last_login
  const result = await pgQuery(
    `INSERT INTO ${TABLE_ACCOUNTS} (id, email, last_login)
     VALUES (gen_random_uuid(), $1::text, $2::timestamptz)
     ON CONFLICT (email) DO UPDATE SET last_login = EXCLUDED.last_login
     RETURNING id, email, created_at AS "createdAt",
               verified_at AS "verifiedAt", last_login AS "lastLogin"`,
    [normalized, ts],
  );

  return result.rows[0] as RecipientAccount;
};

/** Mark an account as verified (called after first successful OTP login). */
export const markRecipientEmailVerified = async (email: string): Promise<void> => {
  const normalized = email.trim().toLowerCase();

  if (!isPostgresAuthConfigured()) {
    const acc = inMemoryAccounts.get(normalized);
    if (acc) inMemoryAccounts.set(normalized, { ...acc, verifiedAt: now() });
    return;
  }

  await pgQuery(
    `UPDATE ${TABLE_ACCOUNTS}
     SET verified_at = NOW()
     WHERE email = $1 AND verified_at IS NULL`,
    [normalized],
  );
};

// ─── Login code operations ──────────────────────────────────────────────────────

/**
 * Create a 6-digit login code for a recipient.
 * Old codes for the same email are invalidated.
 * Returns the raw code (only ever sent via email or logged in dev).
 */
export const createRecipientLoginCode = async (
  email: string,
  slug: string,
): Promise<{ code: string; expiresAt: string }> => {
  const normalized = email.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  if (!isPostgresAuthConfigured()) {
    // Evict old codes for this email
    const idx = inMemoryCodes.findIndex(
      (c) => c.email === normalized && new Date(c.expiresAt) > new Date(),
    );
    inMemoryCodes.splice(0, inMemoryCodes.length, ...inMemoryCodes.filter(
      (c) => c.email !== normalized || new Date(c.expiresAt) <= new Date(),
    ));
    inMemoryCodes.push({
      id: randomUUID(),
      email: normalized,
      codeHash: hashCode(code),
      expiresAt,
      createdAt: now(),
      usedAt: null,
      slug,
    });
    return { code, expiresAt };
  }

  await pgQuery(
    `DELETE FROM ${TABLE_CODES}
     WHERE email = $1 OR expires_at < NOW()`,
    [normalized],
  );

  await pgQuery(
    `INSERT INTO ${TABLE_CODES}
       (id, email, code_hash, expires_at, slug)
     VALUES (gen_random_uuid(), $1::text, $2::text, $3::timestamptz, $4::text)`,
    [normalized, hashCode(code), expiresAt, slug],
  );

  return { code, expiresAt };
};

/**
 * Verify a login code.
 * Returns the email if valid and not yet used; marks it as used.
 * Returns null if expired, wrong, or already used.
 */
export const verifyRecipientLoginCode = async (
  email: string,
  code: string,
): Promise<string | null> => {
  const normalized = email.trim().toLowerCase();

  if (!isPostgresAuthConfigured()) {
    const idx = inMemoryCodes.findIndex(
      (c) =>
        c.email === normalized &&
        c.codeHash === hashCode(code) &&
        !c.usedAt &&
        new Date(c.expiresAt) > new Date(),
    );
    if (idx === -1) return null;
    inMemoryCodes[idx]!.usedAt = now();
    return normalized;
  }

  const result = await pgQuery(
    `UPDATE ${TABLE_CODES}
     SET used_at = NOW()
     WHERE email = $1
       AND code_hash = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING email`,
    [normalized, hashCode(code)],
  );

  return (result.rows[0]?.email as string) ?? null;
};
