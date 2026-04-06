import { NextResponse } from "next/server";

import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
  vaultAcceptanceToAccessPayload,
  vaultViewerBindingCookieName,
  vaultViewerBindingCookieOptions,
} from "@/lib/dataroom/access";
import { isVaultExpired } from "@/lib/dataroom/helpers";
import { getRequestContext } from "@/lib/dataroom/request-context";
import { saveWorkspaceGuestAcceptance } from "@/lib/dataroom/auth-store";
import {
  createWorkspaceNdaToken,
  workspaceNdaCookieName,
  workspaceNdaCookieOptions,
  WORKSPACE_NDA_VERSION,
} from "@/lib/dataroom/workspace-nda-access";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { createEvent, acceptanceWithViewerBindingSchema } from "@/lib/dataroom/types";
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

  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json(
      { error: "This Token room is no longer accepting new access." },
      { status: 403 },
    );
  }

  if (!metadata.requiresNda || !metadata.workspaceId) {
    return NextResponse.json(
      { error: "Workspace NDA is not used for this room." },
      { status: 400 },
    );
  }

  const parsed = acceptanceWithViewerBindingSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add your name, work email, address, and signature to continue." },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const workspaceAcceptanceId = crypto.randomUUID();
  const vaultAcceptanceId = crypto.randomUUID();

  const ctx = getRequestContext(request);

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
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
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
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  };

  await storage.saveAcceptance(slug, vaultAcceptance);

  const vaultToken = createAccessToken({
    ...vaultAcceptanceToAccessPayload(slug, vaultAcceptance),
    viewerBinding: parsed.data.viewerBinding,
  });

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
      ...ctx,
    }),
  );

  const response = NextResponse.json({
    acceptance: vaultAcceptance,
    success: true,
    signedNdaUrl: `/api/vaults/${slug}/signed-nda`,
  });
  response.cookies.set(accessCookieName(slug), vaultToken, accessCookieOptions);
  response.cookies.set(
    vaultViewerBindingCookieName(slug),
    parsed.data.viewerBinding,
    vaultViewerBindingCookieOptions,
  );
  response.cookies.set(
    workspaceNdaCookieName(metadata.workspaceId),
    workspaceToken,
    workspaceNdaCookieOptions,
  );

  return response;
}
