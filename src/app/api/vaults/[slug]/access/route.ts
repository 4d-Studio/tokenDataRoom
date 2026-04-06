import { NextResponse } from "next/server";
import { z } from "zod";

import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
  vaultViewerBindingCookieName,
  vaultViewerBindingCookieOptions,
} from "@/lib/dataroom/access";
import { createEvent, acceptanceWithViewerBindingSchema } from "@/lib/dataroom/types";
import { getWorkspaceById } from "@/lib/dataroom/auth-store";
import { getClientIp, isVaultExpired } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import {
  getOrCreateRecipientAccount,
  createRecipientLoginCode,
  markRecipientEmailVerified,
} from "@/lib/dataroom/recipient-auth";
import { sendRecipientMagicCode } from "@/lib/dataroom/recipient-email";

export const runtime = "nodejs";

const accessSchema = acceptanceWithViewerBindingSchema.extend({
  rememberMe: z.boolean().optional().default(false),
});

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

  const parsed = accessSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add your name, work email, address, and signature to continue." },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const acceptanceId = crypto.randomUUID();

  // If "remember me" is checked, create/link a RecipientAccount and mark email verified
  let recipientAccountId: string | undefined;
  if (parsed.data.rememberMe) {
    const account = await getOrCreateRecipientAccount(parsed.data.signerEmail);
    await markRecipientEmailVerified(account.id);
    recipientAccountId = account.id;
  }

  const acceptance = {
    id: acceptanceId,
    ...(recipientAccountId ? { recipientAccountId } : {}),
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
    viewerBinding: parsed.data.viewerBinding,
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

  // If "remember me", also create a login code and email it to them
  // so they can access this room again without re-signing
  if (parsed.data.rememberMe) {
    try {
      const { code } = await createRecipientLoginCode(parsed.data.signerEmail, slug);
      await sendRecipientMagicCode(parsed.data.signerEmail, code, metadata.title);
    } catch (err) {
      // Non-fatal: NDA is signed, cookies are issued; just log the email failure
      console.error("[access] failed to send recipient login code:", err);
    }
  }

  const response = NextResponse.json({
    acceptance,
    success: true,
    signedNdaUrl: `/api/vaults/${slug}/signed-nda`,
    ...(parsed.data.rememberMe
      ? {
          savedAccess: true,
          savedAccessMessage:
            "Your email is saved. Next time, enter your email on this page to access the room without signing again.",
        }
      : {}),
  });
  response.cookies.set(accessCookieName(slug), token, accessCookieOptions);
  response.cookies.set(
    vaultViewerBindingCookieName(slug),
    parsed.data.viewerBinding,
    vaultViewerBindingCookieOptions,
  );

  return response;
}
