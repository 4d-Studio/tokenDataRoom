import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { accessCookieName, verifyAccessToken } from "@/lib/dataroom/access";
import { getClientIp } from "@/lib/dataroom/helpers";
import {
  createSignedNdaFilename,
  renderSignedNdaHtml,
} from "@/lib/dataroom/signed-nda";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { createEvent } from "@/lib/dataroom/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata || !metadata.requiresNda) {
    return NextResponse.json({ error: "Signed NDA not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const ownerKey = url.searchParams.get("key");
  const requestedAcceptanceId = url.searchParams.get("acceptanceId");
  const cookieStore = await cookies();
  const access = verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
  );

  const isOwner = ownerKey === metadata.ownerKey;
  const acceptanceId = isOwner
    ? requestedAcceptanceId
    : access?.acceptanceId;

  if (!acceptanceId) {
    return NextResponse.json({ error: "Signed NDA access denied." }, { status: 403 });
  }

  if (!isOwner && requestedAcceptanceId && requestedAcceptanceId !== access?.acceptanceId) {
    return NextResponse.json({ error: "Signed NDA access denied." }, { status: 403 });
  }

  const acceptance = await storage.getAcceptance(slug, acceptanceId);

  if (!acceptance) {
    return NextResponse.json({ error: "Signed NDA not found." }, { status: 404 });
  }

  await storage.appendEvent(
    slug,
    createEvent("signed_nda_downloaded", {
      actorName: isOwner ? undefined : acceptance.signerName,
      actorEmail: isOwner ? undefined : acceptance.signerEmail,
      actorCompany: isOwner ? undefined : acceptance.signerCompany,
      note: isOwner
        ? `Owner downloaded signed NDA for ${acceptance.signerName}`
        : "Signer downloaded signed NDA copy",
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  return new NextResponse(renderSignedNdaHtml(metadata, acceptance), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${createSignedNdaFilename(metadata, acceptance)}"`,
    },
  });
}
