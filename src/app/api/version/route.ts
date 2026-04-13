import { NextResponse } from "next/server";

import { getAppRelease } from "@/lib/dataroom/app-release";

export const runtime = "nodejs";

/** Public build id so clients can prompt for reload after deploy. */
export async function GET() {
  return NextResponse.json({
    version: getAppRelease(),
  });
}
