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
import {
  createEvent,
  SHARE_BANNER_MAX_BYTES,
  type VaultRecord,
  vaultFilesList,
} from "@/lib/dataroom/types";
import {
  clampRecipientEmailList,
  MAX_RECIPIENT_INVITES_PER_SEND,
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
    action: z.literal("rename_vault_file"),
    fileId: z.string().min(1),
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(200)
      .refine(
        (s) => !/[\\/]/.test(s) && !s.includes(".."),
        "File name cannot include path characters.",
      ),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("reorder_vault_file"),
    fileId: z.string().min(1),
    direction: z.enum(["up", "down"]),
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
    emails: z.array(z.string().email()).min(1).max(MAX_RECIPIENT_INVITES_PER_SEND),
    roomPassword: z.string().min(1).max(500),
    shareUrl: z.string().url().max(2048),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("set_share_banner"),
    imageDataUrl: z.string().min(32).max(5_500_000),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("clear_share_banner"),
  }),
  z.object({
    ownerKey: z.string().min(32).max(128),
    action: z.literal("set_recipient_hidden_file_ids"),
    fileIds: z.array(z.string().min(1)).max(100),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body was too large or invalid. Try again with a smaller payload." },
      { status: 400 },
    );
  }
  const parsed = ownerPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!verifyOwnerKey(parsed.data.ownerKey, metadata.ownerKey)) {
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

  if (parsed.data.action === "rename_vault_file") {
    const { fileId, name: newName } = parsed.data;
    const listed = vaultFilesList(metadata);
    const entry = listed.find((f) => f.id === fileId);
    if (!entry) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const prevName = entry.name;
    if (prevName === newName) {
      const latestMetadata = await storage.getVaultMetadata(slug);
      const events = await storage.getEvents(slug);
      return NextResponse.json({ metadata: latestMetadata, events });
    }

    let nextMetadata: VaultRecord;

    if (!metadata.vaultFiles?.length) {
      if (fileId !== "legacy-primary") {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }
      nextMetadata = { ...metadata, fileName: newName };
    } else {
      const idx = metadata.vaultFiles.findIndex((f) => f.id === fileId);
      if (idx === -1) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }
      const nextFiles = [...metadata.vaultFiles];
      nextFiles[idx] = { ...nextFiles[idx], name: newName };
      nextMetadata = { ...metadata, vaultFiles: nextFiles };
      const primary = vaultFilesList(nextMetadata)[0];
      if (primary?.id === fileId) {
        nextMetadata = { ...nextMetadata, fileName: newName };
      }
    }

    await storage.updateVaultMetadata(nextMetadata);
    await storage.appendEvent(
      slug,
      createEvent("file_renamed", {
        note: `Renamed file: ${prevName} → ${newName}`,
        ...getRequestContext(request),
      }),
    );
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "reorder_vault_file") {
    const { fileId, direction } = parsed.data;
    const vf = metadata.vaultFiles;
    if (!vf || vf.length < 2) {
      return NextResponse.json(
        { error: "At least two uploaded files are required to change order." },
        { status: 400 },
      );
    }
    const idx = vf.findIndex((f) => f.id === fileId);
    if (idx === -1) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const j = direction === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= vf.length) {
      const latestMetadata = await storage.getVaultMetadata(slug);
      const events = await storage.getEvents(slug);
      return NextResponse.json({ metadata: latestMetadata, events });
    }
    const nextFiles = [...vf];
    [nextFiles[idx], nextFiles[j]] = [nextFiles[j], nextFiles[idx]];
    const nextMetadata = syncLegacyFieldsFromFirstFile({ ...metadata, vaultFiles: nextFiles });
    await storage.updateVaultMetadata(nextMetadata);
    const label = nextFiles.find((f) => f.id === fileId)?.name ?? "file";
    await storage.appendEvent(
      slug,
      createEvent("files_reordered", {
        note: `Moved “${label}” ${direction === "up" ? "earlier" : "later"} in the file list`,
        ...getRequestContext(request),
      }),
    );
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

  if (parsed.data.action === "set_share_banner") {
    const parsedBanner = parseShareBannerDataUrl(parsed.data.imageDataUrl);
    if (!parsedBanner) {
      return NextResponse.json(
        {
          error:
            "Invalid banner image. Use a JPEG, PNG, or WebP file under 3 MB (paste as data URL or re-upload from the manage page).",
        },
        { status: 400 },
      );
    }
    await storage.putShareBanner(slug, parsedBanner.bytes);
    const ext =
      parsedBanner.mimeType === "image/jpeg"
        ? "jpg"
        : parsedBanner.mimeType === "image/png"
          ? "png"
          : "webp";
    const nextMetadata = {
      ...metadata,
      shareBanner: {
        fileName: `room-banner.${ext}`,
        mimeType: parsedBanner.mimeType,
        sizeBytes: parsedBanner.bytes.length,
      },
    };
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "clear_share_banner") {
    try {
      await storage.deleteShareBanner(slug);
    } catch {
      /* best-effort */
    }
    const nextMetadata: VaultRecord = { ...metadata };
    delete nextMetadata.shareBanner;
    await storage.updateVaultMetadata(nextMetadata);
    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);
    return NextResponse.json({ metadata: latestMetadata, events });
  }

  if (parsed.data.action === "set_recipient_hidden_file_ids") {
    const allowed = new Set(vaultFilesList(metadata).map((f) => f.id));
    for (const id of parsed.data.fileIds) {
      if (!allowed.has(id)) {
        return NextResponse.json({ error: `Unknown file id: ${id}` }, { status: 400 });
      }
    }
    const nextMetadata = {
      ...metadata,
      recipientHiddenVaultFileIds:
        parsed.data.fileIds.length > 0 ? parsed.data.fileIds : undefined,
    };
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

/** Keep legacy single-file metadata fields aligned with the first vault file (recipient / old clients). */
function syncLegacyFieldsFromFirstFile(meta: VaultRecord): VaultRecord {
  if (!meta.vaultFiles?.length) return meta;
  const first = meta.vaultFiles[0];
  return {
    ...meta,
    fileName: first.name,
    mimeType: first.mimeType,
    fileSize: first.sizeBytes,
    salt: first.salt,
    iv: first.iv,
    pbkdf2Iterations: first.pbkdf2Iterations,
  };
}

function parseShareBannerDataUrl(
  dataUrl: string,
): { bytes: Buffer; mimeType: string } | null {
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:(image\/(?:jpeg|png|webp));base64,(\S+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const b64 = match[2];
  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length > SHARE_BANNER_MAX_BYTES) return null;
  return { bytes, mimeType };
}
