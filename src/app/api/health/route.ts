import { NextResponse } from "next/server";

import { isPostgresAuthConfigured, pingPostgres } from "@/lib/dataroom/postgres-auth-state";

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
  return NextResponse.json({
    ok: true,
    database: dbOk ? ("connected" as const) : ("error" as const),
  });
}
