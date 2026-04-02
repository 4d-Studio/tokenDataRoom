import { NextResponse } from "next/server";

import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
} from "@/lib/dataroom/access";
import { createEvent, acceptanceSchema } from "@/lib/dataroom/types";
import { getWorkspaceById } from "@/lib/dataroom/auth-store";
import { getClientIp, isVaultExpired } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";

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

  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json(
      { error: "This Token room is no longer accepting new access." },
      { status: 403 },
    );
  }

  if (!metadata.requiresNda) {
    return NextResponse.json({ success: true });
  }

  if (metadata.workspaceId) {
    const workspace = await getWorkspaceById(metadata.workspaceId);
    if (workspace) {
      return NextResponse.json(
        {
          error:
            "This room uses a workspace-wide confidentiality agreement. Sign once using the workspace NDA on the share page; it covers every room in this workspace.",
        },
        { status: 400 },
      );
    }
  }

  const parsed = acceptanceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add your name, work email, address, and signature to continue." },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const acceptanceId = crypto.randomUUID();
  const acceptance = {
    id: acceptanceId,
    acceptedAt,
    ndaVersion: metadata.ndaVersion,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerCompany: parsed.data.signerCompany || undefined,
    signerAddress: parsed.data.signerAddress,
    signatureName: parsed.data.signatureName,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: getClientIp(request),
  };

  await storage.saveAcceptance(slug, acceptance);

  const token = createAccessToken({
    slug,
    acceptanceId,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerCompany: parsed.data.signerCompany || undefined,
    signerAddress: parsed.data.signerAddress,
    signatureName: parsed.data.signatureName,
    ndaVersion: metadata.ndaVersion,
    acceptedAt,
  });

  await storage.appendEvent(
    slug,
    createEvent("nda_accepted", {
      actorName: parsed.data.signerName,
      actorEmail: parsed.data.signerEmail,
      actorCompany: parsed.data.signerCompany || undefined,
      actorAddress: parsed.data.signerAddress,
      note: `Signed NDA from ${parsed.data.signerAddress}`,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  const response = NextResponse.json({
    acceptance,
    success: true,
    signedNdaUrl: `/api/vaults/${slug}/signed-nda`,
  });
  response.cookies.set(accessCookieName(slug), token, accessCookieOptions);

  return response;
}
