import { NextResponse } from "next/server";

import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
  vaultAcceptanceToAccessPayload,
} from "@/lib/dataroom/access";
import { getClientIp, isVaultExpired } from "@/lib/dataroom/helpers";
import { saveWorkspaceGuestAcceptance } from "@/lib/dataroom/auth-store";
import {
  createWorkspaceNdaToken,
  workspaceNdaCookieName,
  workspaceNdaCookieOptions,
  WORKSPACE_NDA_VERSION,
} from "@/lib/dataroom/workspace-nda-access";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { createEvent, acceptanceSchema } from "@/lib/dataroom/types";

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
      { error: "This OpenDataRoom room is no longer accepting new access." },
      { status: 403 },
    );
  }

  if (!metadata.requiresNda || !metadata.workspaceId) {
    return NextResponse.json(
      { error: "Workspace NDA is not used for this room." },
      { status: 400 },
    );
  }

  const parsed = acceptanceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add your name, work email, address, and signature to continue." },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const workspaceAcceptanceId = crypto.randomUUID();
  const vaultAcceptanceId = crypto.randomUUID();

  const workspaceGuest = {
    id: workspaceAcceptanceId,
    workspaceId: metadata.workspaceId,
    acceptedAt,
    ndaVersion: WORKSPACE_NDA_VERSION,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerCompany: parsed.data.signerCompany || undefined,
    signerAddress: parsed.data.signerAddress,
    signatureName: parsed.data.signatureName,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: getClientIp(request),
  };

  await saveWorkspaceGuestAcceptance(workspaceGuest);

  const vaultAcceptance = {
    id: vaultAcceptanceId,
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

  await storage.saveAcceptance(slug, vaultAcceptance);

  const vaultToken = createAccessToken(vaultAcceptanceToAccessPayload(slug, vaultAcceptance));

  const workspaceToken = createWorkspaceNdaToken({
    workspaceId: metadata.workspaceId,
    acceptanceId: workspaceAcceptanceId,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerCompany: parsed.data.signerCompany || undefined,
    signerAddress: parsed.data.signerAddress,
    signatureName: parsed.data.signatureName,
    ndaVersion: WORKSPACE_NDA_VERSION,
    acceptedAt,
  });

  await storage.appendEvent(
    slug,
    createEvent("nda_accepted", {
      actorName: parsed.data.signerName,
      actorEmail: parsed.data.signerEmail,
      actorCompany: parsed.data.signerCompany || undefined,
      actorAddress: parsed.data.signerAddress,
      note: "Workspace NDA accepted (covers all rooms in this workspace).",
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  const response = NextResponse.json({
    acceptance: vaultAcceptance,
    success: true,
    signedNdaUrl: `/api/vaults/${slug}/signed-nda`,
  });
  response.cookies.set(accessCookieName(slug), vaultToken, accessCookieOptions);
  response.cookies.set(
    workspaceNdaCookieName(metadata.workspaceId),
    workspaceToken,
    workspaceNdaCookieOptions,
  );

  return response;
}
