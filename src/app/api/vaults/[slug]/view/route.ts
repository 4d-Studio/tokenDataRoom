import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { getRequestContext } from "@/lib/dataroom/request-context";
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

  const ctx = getRequestContext(request);
  await storage.appendEvent(
    slug,
    createEvent("viewed", {
      note: "Share page opened",
      actorName: access?.signerName,
      actorEmail: access?.signerEmail,
      actorCompany: access?.signerCompany,
      ...ctx,
    }),
  );

  return NextResponse.json({ success: true });
}
