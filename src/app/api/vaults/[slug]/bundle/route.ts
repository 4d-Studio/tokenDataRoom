import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accessCookieName, verifyAccessToken } from "@/lib/filmia/access";
import { getClientIp, isVaultExpired } from "@/lib/filmia/helpers";
import { getVaultStorage } from "@/lib/filmia/storage";
import { createEvent } from "@/lib/filmia/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json(
      { error: "This Filmia room is no longer available." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const access = verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
  );

  if (metadata.requiresNda && !access) {
    return NextResponse.json(
      { error: "Accept the NDA before requesting the encrypted file." },
      { status: 403 },
    );
  }

  const encryptedFile = await storage.getEncryptedFile(slug);

  if (!encryptedFile) {
    return NextResponse.json(
      { error: "The encrypted file could not be retrieved." },
      { status: 500 },
    );
  }

  await storage.appendEvent(
    slug,
    createEvent("downloaded", {
      actorName: access?.signerName,
      actorEmail: access?.signerEmail,
      actorCompany: access?.signerCompany,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  return new NextResponse(encryptedFile, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${metadata.fileName}.filmia"`,
    },
  });
}
