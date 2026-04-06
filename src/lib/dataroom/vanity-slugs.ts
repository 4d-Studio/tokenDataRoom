/**
 * Vanity slugs: human-readable aliases for room share/manage links.
 *
 * Schema: tkn_vanity_slugs (vanity_slug PK, real_slug UNIQUE)
 * Falls back to in-memory store when DATABASE_URL is not configured.
 *
 * Rules:
 *  - 3–60 characters
 *  - lowercase letters, digits, hyphens only
 *  - cannot start with "fm-" (reserved for system slugs)
 *  - must be globally unique
 */
import { getPgPool, isPostgresAuthConfigured } from "@/lib/dataroom/postgres-auth-state";

const TABLE = "tkn_vanity_slugs";

const VANITY_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

export const isValidVanitySlug = (slug: string): boolean =>
  VANITY_SLUG_PATTERN.test(slug) && !slug.startsWith("fm-");

// ─── In-memory fallback (dev / no DB) ──────────────────────────────────────────

const inMemoryMap = new Map<string, string>(); // vanity → real
const inMemoryReverse = new Map<string, string>(); // real → vanity

// ─── Public API ────────────────────────────────────────────────────────────────

/** Resolve a vanity slug to the real fm-* slug. Returns null if not found. */
export const resolveVanitySlug = async (vanitySlug: string): Promise<string | null> => {
  if (!isPostgresAuthConfigured()) {
    return inMemoryMap.get(vanitySlug) ?? null;
  }

  const pool = getPgPool();
  const result = await pool.query<{ real_slug: string }>(
    `SELECT real_slug FROM ${TABLE} WHERE vanity_slug = $1`,
    [vanitySlug],
  );
  return result.rows[0]?.real_slug ?? null;
};

/** Get the vanity slug for a real slug. Returns null if none set. */
export const getVanitySlugForRoom = async (realSlug: string): Promise<string | null> => {
  if (!isPostgresAuthConfigured()) {
    return inMemoryReverse.get(realSlug) ?? null;
  }

  const pool = getPgPool();
  const result = await pool.query<{ vanity_slug: string }>(
    `SELECT vanity_slug FROM ${TABLE} WHERE real_slug = $1`,
    [realSlug],
  );
  return result.rows[0]?.vanity_slug ?? null;
};

/**
 * Register or update a vanity slug for a room.
 * Throws if the vanity slug is already taken by another room.
 */
export const setVanitySlug = async (
  realSlug: string,
  vanitySlug: string,
): Promise<void> => {
  if (!isValidVanitySlug(vanitySlug)) {
    throw new Error(
      "Vanity slug must be 3–60 characters, lowercase letters/digits/hyphens, and cannot start with fm-.",
    );
  }

  if (!isPostgresAuthConfigured()) {
    const existing = inMemoryMap.get(vanitySlug);
    if (existing && existing !== realSlug) {
      throw new Error("This custom link is already taken.");
    }
    // Remove old vanity for this room
    const oldVanity = inMemoryReverse.get(realSlug);
    if (oldVanity) inMemoryMap.delete(oldVanity);
    inMemoryMap.set(vanitySlug, realSlug);
    inMemoryReverse.set(realSlug, vanitySlug);
    return;
  }

  const pool = getPgPool();

  // Check if this vanity slug is taken by a different room
  const conflict = await pool.query<{ real_slug: string }>(
    `SELECT real_slug FROM ${TABLE} WHERE vanity_slug = $1`,
    [vanitySlug],
  );
  if (conflict.rows[0] && conflict.rows[0].real_slug !== realSlug) {
    throw new Error("This custom link is already taken.");
  }

  // Remove old vanity for this room, then insert/upsert new one
  await pool.query(`DELETE FROM ${TABLE} WHERE real_slug = $1`, [realSlug]);
  await pool.query(
    `INSERT INTO ${TABLE} (vanity_slug, real_slug) VALUES ($1, $2)
     ON CONFLICT (vanity_slug) DO UPDATE SET real_slug = EXCLUDED.real_slug`,
    [vanitySlug, realSlug],
  );
};

/** Remove the vanity slug for a room. */
export const removeVanitySlug = async (realSlug: string): Promise<void> => {
  if (!isPostgresAuthConfigured()) {
    const vanity = inMemoryReverse.get(realSlug);
    if (vanity) {
      inMemoryMap.delete(vanity);
      inMemoryReverse.delete(realSlug);
    }
    return;
  }

  const pool = getPgPool();
  await pool.query(`DELETE FROM ${TABLE} WHERE real_slug = $1`, [realSlug]);
};
