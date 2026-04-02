import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
  readVaultAccessFromCookies,
  vaultAcceptanceToAccessPayload,
  vaultViewerBindingCookieName,
  vaultViewerBindingCookieOptions,
} from "@/lib/dataroom/access";
import { getClientIp, isVaultExpired } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  workspaceNdaCookieName,
  verifyWorkspaceNdaToken,
} from "@/lib/dataroom/workspace-nda-access";
import { createEvent, viewerBindingOnlySchema } from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

/**
 * If the browser already has a valid workspace NDA cookie but not this room’s
 * vault access cookie, mint room access from the workspace payload (one signature, many rooms).
 */
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
      { error: "Workspace bootstrap does not apply to this room." },
      { status: 400 },
    );
  }

  let bodyJson: unknown = {};
  try {
    bodyJson = await request.json();
  } catch {
    /* empty body */
  }
  const bindingParsed = viewerBindingOnlySchema.safeParse(bodyJson);
  if (!bindingParsed.success) {
    return NextResponse.json(
      { error: "Browser session binding required. Refresh the page and try again." },
      { status: 400 },
    );
  }
  const viewerBinding = bindingParsed.data.viewerBinding;

  const cookieStore = await cookies();
  const existingVault = readVaultAccessFromCookies(cookieStore, slug);

  if (existingVault) {
    return NextResponse.json({ success: true, alreadyGranted: true });
  }

  const ws = verifyWorkspaceNdaToken(
    cookieStore.get(workspaceNdaCookieName(metadata.workspaceId))?.value,
    metadata.workspaceId,
  );

  if (!ws) {
    return NextResponse.json(
      { error: "Workspace confidentiality agreement required first." },
      { status: 403 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const vaultAcceptanceId = crypto.randomUUID();

  const vaultAcceptance = {
    id: vaultAcceptanceId,
    acceptedAt,
    ndaVersion: metadata.ndaVersion,
    signerName: ws.signerName,
    signerEmail: ws.signerEmail,
    signerCompany: ws.signerCompany,
    signerAddress: ws.signerAddress,
    signatureName: ws.signatureName,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: getClientIp(request),
  };

  await storage.saveAcceptance(slug, vaultAcceptance);

  await storage.appendEvent(
    slug,
    createEvent("nda_accepted", {
      actorName: ws.signerName,
      actorEmail: ws.signerEmail,
      actorCompany: ws.signerCompany,
      actorAddress: ws.signerAddress,
      note: "Room access from prior workspace NDA acceptance.",
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipAddress: getClientIp(request),
    }),
  );

  const token = createAccessToken({
    ...vaultAcceptanceToAccessPayload(slug, vaultAcceptance),
    viewerBinding,
  });

  const response = NextResponse.json({
    success: true,
    acceptance: vaultAcceptance,
    signedNdaUrl: `/api/vaults/${slug}/signed-nda`,
  });
  response.cookies.set(accessCookieName(slug), token, accessCookieOptions);
  response.cookies.set(
    vaultViewerBindingCookieName(slug),
    viewerBinding,
    vaultViewerBindingCookieOptions,
  );

  return response;
}
