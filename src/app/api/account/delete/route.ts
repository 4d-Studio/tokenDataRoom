import { NextResponse } from "next/server";

import { deleteCurrentUser } from "@/lib/dataroom/auth";
import { sessionCookieName } from "@/lib/dataroom/session";

export const runtime = "nodejs";

export async function DELETE() {
  const deleted = await deleteCurrentUser();

  if (!deleted) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ deleted: true });
  response.cookies.delete(sessionCookieName);
  return response;
}
