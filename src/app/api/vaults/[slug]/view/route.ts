import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getClientIp } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { createEvent } from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const access = readVaultAccessFromCookies(cookieStore, slug);

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
