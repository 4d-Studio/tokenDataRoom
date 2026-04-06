import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getClientIp, isVaultExpired, toAsciiDispositionBasename } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  createEvent,
  vaultFilesList,
  vaultHasEncryptedDocument,
} from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

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

  // No fileId → return the file manifest (JSON list of files)
  if (!fileId) {
    return NextResponse.json({ files: vaultFilesList(metadata) });
  }

  // Specific file download
  const files = vaultFilesList(metadata);
  const fileEntry = files.find((f) => f.id === fileId);
  if (!fileEntry) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const encryptedFile = await storage.getVaultFile(slug, fileId);
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
      note: `Downloaded: ${fileEntry.name}`,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  const safeBase = toAsciiDispositionBasename(fileEntry.name);
  return new NextResponse(new Uint8Array(encryptedFile), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${safeBase}.filmia"`,
    },
  });
}
