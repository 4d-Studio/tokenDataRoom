import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getClientIp, isVaultExpired, toAsciiDispositionBasename } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { createEvent, vaultHasEncryptedDocument } from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

export async function GET(
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

  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json(
      { error: "This Token room is no longer available." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const access = readVaultAccessFromCookies(cookieStore, slug);

  if (metadata.requiresNda && !access) {
    return NextResponse.json(
      { error: "Accept the NDA before requesting the encrypted file." },
      { status: 403 },
    );
  }

  if (!vaultHasEncryptedDocument(metadata)) {
    return NextResponse.json(
      { error: "No document has been added to this room yet." },
      { status: 404 },
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

  const safeBase = toAsciiDispositionBasename(metadata.fileName);
  return new NextResponse(new Uint8Array(encryptedFile), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${safeBase}.filmia"`,
    },
  });
}
