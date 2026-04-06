import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteWorkspaceRoom, syncWorkspaceRoomStatus } from "@/lib/dataroom/auth";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { verifyOwnerKey, isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import { createEvent } from "@/lib/dataroom/types";

export const runtime = "nodejs";

const ownerPostSchema = z.discriminatedUnion("action", [
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("revoke"),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("restore"),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("save_owner_notes"),
    ownerNotes: z.string().max(4000).optional(),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("edit_room"),
    title: z.string().trim().min(3).max(80).optional(),
    message: z.string().trim().max(240).optional(),
    senderName: z.string().trim().min(2).max(60).optional(),
    senderCompany: z.string().trim().max(60).optional(),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("update_file_category"),
    fileId: z.string().min(1),
    category: z.string().trim().max(60),
  }),
]);

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

  const parsed = ownerPostSchema.safeParse(await request.json());

  if (!parsed.success || !verifyOwnerKey(parsed.data.ownerKey, metadata.ownerKey)) {
    return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
  }

  if (parsed.data.action === "save_owner_notes") {
    const nextMetadata = {
      ...metadata,
      ownerNotes: parsed.data.ownerNotes?.trim() || undefined,
    };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "edit_room") {
    const updates: Partial<typeof metadata> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.message !== undefined) updates.message = parsed.data.message;
    if (parsed.data.senderName !== undefined) updates.senderName = parsed.data.senderName;
    if (parsed.data.senderCompany !== undefined) updates.senderCompany = parsed.data.senderCompany;
    const nextMetadata = { ...metadata, ...updates };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "update_file_category") {
    const { fileId, category } = parsed.data;
    const files = metadata.vaultFiles ?? [];
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx === -1) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    files[idx] = { ...files[idx], category: category || undefined };
    const nextMetadata = { ...metadata, vaultFiles: files };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  const nextStatus = parsed.data.action === "revoke" ? "revoked" : "active";

  if (metadata.status !== nextStatus) {
    const nextMetadata = {
      ...metadata,
      status: nextStatus,
    } as const;

    await storage.updateVaultMetadata(nextMetadata);
    await storage.appendEvent(
      slug,
      createEvent(parsed.data.action === "revoke" ? "revoked" : "reactivated", {
        note:
          parsed.data.action === "revoke"
            ? "Owner revoked access"
            : "Owner restored access",
        userAgent: request.headers.get("user-agent") ?? undefined,
      }),
    );

    if (metadata.workspaceId) {
      await syncWorkspaceRoomStatus(metadata.workspaceId, metadata.id, nextStatus);
    }
  }

  const latestMetadata = await storage.getVaultMetadata(slug);
  const events = await storage.getEvents(slug);

  return NextResponse.json({
    metadata: latestMetadata,
    events,
  });
}

const deleteSchema = z.object({
  ownerKey: z.string().min(32).max(128),
});

export async function DELETE(
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

  const parsed = deleteSchema.safeParse(await request.json());

  if (!parsed.success || !verifyOwnerKey(parsed.data.ownerKey, metadata.ownerKey)) {
    return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
  }

  await storage.deleteVault(slug);

  if (metadata.workspaceId) {
    await deleteWorkspaceRoom(metadata.workspaceId, metadata.id);
  }

  return NextResponse.json({ deleted: true });
}
