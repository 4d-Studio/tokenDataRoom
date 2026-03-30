import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accessCookieName, verifyAccessToken } from "@/lib/filmia/access";
import { getClientIp } from "@/lib/filmia/helpers";
import { getVaultStorage } from "@/lib/filmia/storage";
import { createEvent } from "@/lib/filmia/types";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const access = verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
  );

  await storage.appendEvent(
    slug,
    createEvent("viewed", {
      note: "Share page opened",
      actorName: access?.signerName,
      actorEmail: access?.signerEmail,
      actorCompany: access?.signerCompany,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  return NextResponse.json({ success: true });
}
