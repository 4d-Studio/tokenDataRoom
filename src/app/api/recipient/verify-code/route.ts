/**
 * POST /api/recipient/verify-code
 *
 * Request body:  { email: string, code: string, slug: string }
 *
 * Verifies the 6-digit OTP.
 * If the recipient has an existing acceptance for this room, issues access cookies.
 * If no acceptance exists yet, returns a "pending_nda" flag — the UI should
 * redirect them to sign the NDA first (but pre-filled with their email).
 *
 * Cookies issued:
 *   tkn_access_<slug>       — HMAC-signed access token (30-day, httpOnly)
 *   tkn_vbind_<slug>        — viewer binding UUID (session, httpOnly)
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitKey } from "@/lib/dataroom/rate-limit";
import {
  accessCookieName,
  accessCookieOptions,
  createAccessToken,
  vaultViewerBindingCookieName,
  vaultViewerBindingCookieOptions,
} from "@/lib/dataroom/access";
import { createEvent } from "@/lib/dataroom/types";
import {
  getRecipientAccountByEmail,
  markRecipientEmailVerified,
  verifyRecipientLoginCode,
} from "@/lib/dataroom/recipient-auth";
import { getClientIp } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().min(6).max(6),
  slug: z.string().trim(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email and the 6-digit code we sent." },
      { status: 400 },
    );
  }

  const { email, code, slug } = parsed.data;

  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  // Rate limit
  const rlKey = rateLimitKey(ip, email);
  const { allowed } = checkRateLimit(rlKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a moment before trying again." },
      { status: 429 },
    );
  }

  let verifiedEmail: string;
  try {
    verifiedEmail = await verifyRecipientLoginCode(email, code) ?? "";
  } catch (err) {
    console.error("[recipient/verify-code] code verify failed:", err);
    return NextResponse.json(
      { error: "Code expired or incorrect." },
      { status: 401 },
    );
  }

  if (!verifiedEmail) {
    return NextResponse.json(
      { error: "Code expired or incorrect." },
      { status: 401 },
    );
  }

  // Mark account verified on first successful login
  await markRecipientEmailVerified(email);

  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (metadata.status !== "active") {
    return NextResponse.json({ error: "This room is no longer accepting access." }, { status: 403 });
  }

  // Look up existing acceptance for this recipient in this room
  const acceptances = await storage.getAcceptances(slug);
  const existing = acceptances.find(
    (a) => a.signerEmail.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    // Already signed NDA — issue access cookies directly
    const viewerBinding = crypto.randomUUID();

    const token = createAccessToken({
      slug,
      acceptanceId: existing.id,
      signerName: existing.signerName,
      signerEmail: existing.signerEmail,
      signerCompany: existing.signerCompany,
      signerAddress: existing.signerAddress,
      signatureName: existing.signatureName,
      ndaVersion: existing.ndaVersion,
      acceptedAt: existing.acceptedAt,
      viewerBinding,
    });

    // Log return visit
    await storage.appendEvent(
      slug,
      createEvent("viewed", {
        actorName: existing.signerName,
        actorEmail: existing.signerEmail,
        actorCompany: existing.signerCompany,
        actorAddress: existing.signerAddress,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: getClientIp(request),
      }),
    );

    const response = NextResponse.json({
      success: true,
      accessGranted: true,
      hasAcceptedNda: true,
      signerName: existing.signerName,
    });

    response.cookies.set(accessCookieName(slug), token, accessCookieOptions);
    response.cookies.set(
      vaultViewerBindingCookieName(slug),
      viewerBinding,
      vaultViewerBindingCookieOptions,
    );

    return response;
  }

  // No NDA signed yet — let the UI know they need to sign first (pre-filled email)
  return NextResponse.json({
    success: true,
    accessGranted: false,
    hasAcceptedNda: false,
    pendingEmail: email,
    message: "You need to sign the NDA before accessing this room.",
  });
}
