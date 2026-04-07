import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteWorkspaceRoom, syncWorkspaceRoomStatus } from "@/lib/dataroom/auth";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { verifyOwnerKey, isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import {
  setVanitySlug,
  removeVanitySlug,
  checkVanityAvailabilityForRoom,
  isValidVanitySlug,
} from "@/lib/dataroom/vanity-slugs";
import { getRequestContext } from "@/lib/dataroom/request-context";
import { sendRoomInviteEmail } from "@/lib/dataroom/recipient-email";
import { createEvent } from "@/lib/dataroom/types";
import {
  clampRecipientEmailList,
  normalizeRecipientEmailList,
} from "@/lib/dataroom/vault-recipient-access";

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
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("set_vanity_slug"),
    vanitySlug: z.string().trim().min(3).max(60),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("remove_vanity_slug"),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("check_vanity_availability"),
    vanitySlug: z.string().trim().max(60),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("set_recipient_restriction"),
    enabled: z.boolean(),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("replace_allowed_recipient_emails"),
    emails: z.array(z.string().email()).max(100),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("send_recipient_invites"),
    emails: z.array(z.string().email()).min(1).max(25),
    roomPassword: z.string().min(1).max(500),
    shareUrl: z.string().url().max(2048),
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

  if (parsed.data.action === "set_vanity_slug") {
    const { vanitySlug } = parsed.data;
    if (!isValidVanitySlug(vanitySlug)) {
      return NextResponse.json(
        { error: "Custom link must be 3–60 characters: lowercase letters, numbers, and hyphens only. Cannot start with fm-." },
        { status: 400 },
      );
    }
    try {
      await setVanitySlug(slug, vanitySlug);
      const latestMetadata = await storage.getVaultMetadata(slug);
      const events = await storage.getEvents(slug);
      return NextResponse.json({ metadata: latestMetadata, events, vanitySlug });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to set custom link.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
  }

  if (parsed.data.action === "remove_vanity_slug") {
    await removeVanitySlug(slug);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events, vanitySlug: null });
  }

  if (parsed.data.action === "check_vanity_availability") {
    const { vanitySlug } = parsed.data;
    const result = await checkVanityAvailabilityForRoom(slug, vanitySlug);
    return NextResponse.json(result);
  }

  if (parsed.data.action === "set_recipient_restriction") {
    const nextMetadata = {
      ...metadata,
      restrictRecipientEmails: parsed.data.enabled,
    };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "replace_allowed_recipient_emails") {
    const merged = clampRecipientEmailList(parsed.data.emails);
    const nextMetadata = {
      ...metadata,
      allowedRecipientEmails: merged,
    };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "send_recipient_invites") {
    let shareParsed: URL;
    try {
      shareParsed = new URL(parsed.data.shareUrl.trim());
    } catch {
      return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
    }
    if (!shareParsed.pathname.includes("/s/")) {
      return NextResponse.json(
        {
          error:
            "Share link must be a recipient room URL (its path must include /s/). Paste the link from “Copy share link”.",
        },
        { status: 400 },
      );
    }

    const invitedNorm = normalizeRecipientEmailList(parsed.data.emails);
    const prev = metadata.allowedRecipientEmails ?? [];
    const merged = clampRecipientEmailList([...prev, ...invitedNorm]);
    const nextMetadata = {
      ...metadata,
      restrictRecipientEmails: true,
      allowedRecipientEmails: merged,
    };
    await storage.updateVaultMetadata(nextMetadata);

    const roomName = metadata.title;
    const ctx = getRequestContext(request);
    const shareUrl = parsed.data.shareUrl.trim();

    for (const toEmail of invitedNorm) {
      try {
        await sendRoomInviteEmail(toEmail, roomName, shareUrl, parsed.data.roomPassword);
        await storage.appendEvent(
          slug,
          createEvent("invite_sent", {
            actorEmail: toEmail,
            note: `Invite email sent to ${toEmail}`,
            ...ctx,
          }),
        );
      } catch (err) {
        console.error("[owner/send_recipient_invites]", toEmail, err);
      }
    }

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
        ...getRequestContext(request),
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
