import { NextResponse } from "next/server";
import { z } from "zod";

import { sortSigningSigners } from "@/lib/dataroom/document-signing";
import { getRequestContext } from "@/lib/dataroom/request-context";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { verifySigningInviteToken } from "@/lib/dataroom/signing-invite-token";
import {
  createEvent,
  type SigningRequest,
  type VaultRecord,
  vaultFilesList,
} from "@/lib/dataroom/types";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import { isVaultExpired } from "@/lib/dataroom/helpers";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    token: z.string().min(1),
    signatureName: z.string().max(80).optional().default(""),
    signatureImage: z.string().max(500_000).optional(),
  })
  .refine(
    (d) =>
      Boolean(d.signatureImage?.trim()) || d.signatureName.trim().length >= 2,
    { message: "Add your name and signature to continue.", path: ["signatureName"] },
  );

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; requestId: string }> },
) {
  const { slug, requestId } = await params;
  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.signatureName?.[0] ??
      "Add your name and signature to continue.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const invite = verifySigningInviteToken(parsed.data.token, slug, requestId);
  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired signing link." }, { status: 403 });
  }

  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);
  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json(
      { error: "This room is no longer accepting signatures." },
      { status: 403 },
    );
  }

  const list = metadata.signingRequests ?? [];
  const idx = list.findIndex((r) => r.id === requestId);
  if (idx === -1) {
    return NextResponse.json({ error: "Signing workflow not found." }, { status: 404 });
  }

  const signingRequest = list[idx];
  if (signingRequest.status !== "active") {
    return NextResponse.json(
      { error: "This signing workflow is no longer active." },
      { status: 400 },
    );
  }

  const sorted = sortSigningSigners(signingRequest);
  const target = sorted.find((s) => s.id === invite.signerId);
  if (!target) {
    return NextResponse.json({ error: "Signer not found." }, { status: 404 });
  }

  if (target.status === "signed") {
    return NextResponse.json({ error: "You have already signed." }, { status: 400 });
  }

  const active = sorted[signingRequest.currentOrderIndex];
  if (!active || active.id !== target.id) {
    return NextResponse.json(
      { error: "It is not your turn to sign yet. Wait for earlier signers to finish." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const sigImg = parsed.data.signatureImage?.trim();
  const signatureNameForStore = sigImg
    ? parsed.data.signatureName.trim() || target.name || target.email.split("@")[0] || "Signature"
    : parsed.data.signatureName.trim();

  const updatedSigners = signingRequest.signers.map((s) =>
    s.id === target.id
      ? {
          ...s,
          status: "signed" as const,
          signedAt: now,
          signatureName: signatureNameForStore,
          ...(sigImg ? { signatureImage: sigImg } : {}),
        }
      : s,
  );

  const nextIndex = signingRequest.currentOrderIndex + 1;
  const completed = nextIndex >= sorted.length;
  const nextSigningRequest: SigningRequest = {
    ...signingRequest,
    signers: updatedSigners,
    currentOrderIndex: completed ? signingRequest.currentOrderIndex + 1 : nextIndex,
    status: completed ? "completed" : "active",
  };

  const nextList = [...list];
  nextList[idx] = nextSigningRequest;
  const nextMetadata: VaultRecord = { ...metadata, signingRequests: nextList };
  await storage.updateVaultMetadata(nextMetadata);

  const ctx = getRequestContext(request);
  const file = vaultFilesList(metadata).find((f) => f.id === signingRequest.fileId);
  await storage.appendEvent(
    slug,
    createEvent("document_signing_signed", {
      actorEmail: target.email,
      actorName: target.name,
      note: `${target.email} signed “${file?.name ?? "document"}” (${completed ? "workflow complete" : "next signer"})`,
      ...ctx,
    }),
  );

  if (completed) {
    await storage.appendEvent(
      slug,
      createEvent("document_signing_completed", {
        note: `Document signing completed for “${file?.name ?? "document"}”`,
        ...ctx,
      }),
    );
  }

  return NextResponse.json({
    success: true,
    completed,
    certificatePath: `/api/vaults/${slug}/signing/${requestId}/certificate`,
  });
}
