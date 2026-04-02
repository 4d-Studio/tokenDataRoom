import { NextResponse } from "next/server";

import {
  getPgPool,
  isPostgresAuthConfigured,
  pingPostgres,
} from "@/lib/dataroom/postgres-auth-state";

export const dynamic = "force-dynamic";

/**
 * Liveness for load balancers (Railway, etc.): always 200 so routing works.
 * Use `database` in the JSON to see if Postgres is reachable — fix env/SSL if `"error"`.
 */
export async function GET() {
  if (!isPostgresAuthConfigured()) {
    return NextResponse.json({ ok: true, database: "disabled" as const });
  }
  const dbOk = await pingPostgres();
  if (!dbOk) {
    return NextResponse.json({ ok: true, database: "error" as const });
  }
  let authStateTable: "ok" | "missing" = "missing";
  try {
    const pool = getPgPool();
    const r = await pool.query<{ reg: string | null }>(
      `SELECT to_regclass('public.tkn_auth_state') AS reg`,
    );
    if (r.rows[0]?.reg) authStateTable = "ok";
  } catch {
    authStateTable = "missing";
  }
  return NextResponse.json({
    ok: true,
    database: "connected" as const,
    authStateTable,
  });
}
