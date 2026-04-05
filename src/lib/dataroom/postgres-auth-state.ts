import { Pool } from "pg";

import { AUTH_STATE_TABLE_MISSING_MARKER } from "@/lib/dataroom/auth-state-errors";

/** Mirrors the JSON blob in `auth-store` (single-table persistence). */
export type AuthStateSnapshot = {
  users: unknown[];
  workspaces: unknown[];
  rooms: unknown[];
  codes: unknown[];
  workspaceGuestAcceptances: unknown[];
};

const TABLE = "tkn_auth_state";

declare global {
  var __tknPgPool: Pool | undefined;
}

const emptyJsonState = () =>
  JSON.stringify({
    users: [],
    workspaces: [],
    rooms: [],
    codes: [],
    workspaceGuestAcceptances: [],
  });

const normalizeRow = (raw: unknown): AuthStateSnapshot => {
  const parsed =
    typeof raw === "string"
      ? (JSON.parse(raw) as Partial<AuthStateSnapshot>)
      : (raw as Partial<AuthStateSnapshot>);
  return {
    users: parsed.users ?? [],
    workspaces: parsed.workspaces ?? [],
    rooms: parsed.rooms ?? [],
    codes: parsed.codes ?? [],
    workspaceGuestAcceptances: parsed.workspaceGuestAcceptances ?? [],
  };
};

const connectionStringNeedsSsl = (url: string) =>
  !url.includes("localhost") && !url.includes("127.0.0.1") && !url.includes("socket");

/** Railway / hosts vary: prefer DATABASE_URL, then common aliases. */
export const getDatabaseConnectionString = (): string | undefined => {
  for (const key of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "RAILWAY_DATABASE_URL",
  ] as const) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
};

export const isPostgresAuthConfigured = () => Boolean(getDatabaseConnectionString());

export const getPgPool = (): Pool => {
  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    throw new Error("No database URL (set DATABASE_URL or POSTGRES_URL)");
  }
  if (!globalThis.__tknPgPool) {
    globalThis.__tknPgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ssl: connectionStringNeedsSsl(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return globalThis.__tknPgPool;
};

let tableReady: Promise<void> | null = null;

/** Table is created by migrations (see migrations/). Fails fast if missing. */
const ensureTable = async () => {
  if (!tableReady) {
    const pool = getPgPool();
    tableReady = pool
      .query<{ reg: string | null }>(
        `SELECT to_regclass('public.${TABLE}') AS reg`,
      )
      .then((res) => {
        if (!res.rows[0]?.reg) {
          throw new Error(
            `PostgreSQL table public.${TABLE} is missing (${AUTH_STATE_TABLE_MISSING_MARKER}). Run migrations: pnpm db:migrate (Railway runs this in releaseCommand).`,
          );
        }
      });
  }
  await tableReady;
};

export const readAuthStateFromPostgres = async (): Promise<AuthStateSnapshot> => {
  await ensureTable();
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO ${TABLE} (id, state) VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [emptyJsonState()],
  );
  const res = await pool.query<{ state: unknown }>(
    `SELECT state FROM ${TABLE} WHERE id = 1`,
  );
  if (!res.rows[0]) {
    return normalizeRow(JSON.parse(emptyJsonState()));
  }
  return normalizeRow(res.rows[0].state);
};

export const writeAuthStateToPostgres = async (state: AuthStateSnapshot) => {
  await ensureTable();
  const pool = getPgPool();
  const payload = JSON.stringify(state);
  await pool.query(
    `INSERT INTO ${TABLE} (id, state, updated_at) VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
    [payload],
  );
};

/** Optional health check for deploy probes / debugging. */
export const pingPostgres = async (): Promise<boolean> => {
  if (!isPostgresAuthConfigured()) return false;
  try {
    const pool = getPgPool();
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
};
