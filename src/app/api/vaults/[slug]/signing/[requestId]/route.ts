import { NextResponse } from "next/server";

import { getSigningInviteState } from "@/lib/dataroom/document-signing";
import { isVaultExpired } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { verifySigningInviteToken } from "@/lib/dataroom/signing-invite-token";
import { vaultFilesList } from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

/**
 * Bootstrap the document-signing page (recipient with invite token).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; requestId: string }> },
) {
  const { slug, requestId } = await params;
  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const payload = verifySigningInviteToken(token, slug, requestId);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired signing link." }, { status: 403 });
  }

  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);
  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const signingRequest = (metadata.signingRequests ?? []).find((r) => r.id === requestId) ?? null;
  if (!signingRequest) {
    return NextResponse.json({ error: "Signing workflow not found." }, { status: 404 });
  }

  const terminal =
    signingRequest.status === "completed" || signingRequest.status === "voided";
  if (!terminal && (metadata.status !== "active" || isVaultExpired(metadata.expiresAt))) {
    return NextResponse.json(
      { error: "This room is no longer available for signing." },
      { status: 403 },
    );
  }

  const file = vaultFilesList(metadata).find((f) => f.id === signingRequest.fileId);
  if (!file && !terminal) {
    return NextResponse.json({ error: "Document was removed from this room." }, { status: 404 });
  }

  const state = getSigningInviteState(signingRequest, payload.signerId);

  return NextResponse.json({
    title: metadata.title,
    senderName: metadata.senderName,
    fileName: file?.name ?? "Document (no longer in room)",
    message: signingRequest.message ?? null,
    phase: state.phase,
    signerEmail: state.signer?.email ?? null,
    signerName: state.signer?.name ?? null,
    signers: state.sorted.map((s) => ({
      email: s.email,
      name: s.name,
      order: s.order,
      status: s.status,
      signedAt: s.signedAt,
    })),
  });
}
