import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getCurrentUser } from "@/lib/dataroom/auth";
import { isVaultExpired } from "@/lib/dataroom/helpers";
import { getRequestContext } from "@/lib/dataroom/request-context";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  attachVaultPayloadSchema,
  contributorAttachVaultPayloadSchema,
  createEvent,
  ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES,
  isSupportedFileType,
  type VaultFileEntry,
  type VaultRecord,
  vaultFilesList,
} from "@/lib/dataroom/types";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";
import {
  normalizeRecipientEmail,
  recipientVaultAccessRoleForEmail,
} from "@/lib/dataroom/vault-recipient-access";

const vaultFileNameKey = (name: string) => name.trim().toLowerCase();

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET /api/vaults/[slug]/payload — list files (for recipient + owner). */
export async function GET(
  _request: Request,
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
  return NextResponse.json({ files: vaultFilesList(metadata) });
}

/** POST /api/vaults/[slug]/payload — add a new encrypted file (owner key or contributor session). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!isValidPublicVaultSlug(slug)) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    const storage = getVaultStorage();
    const existing = await storage.getVaultMetadata(slug);

    if (!existing) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const metadataEntry = formData.get("metadata");
    const encryptedFile = formData.get("encryptedFile");

    if (typeof metadataEntry !== "string" || !(encryptedFile instanceof File)) {
      return NextResponse.json(
        { error: "Encrypted file and metadata are required." },
        { status: 400 },
      );
    }

    let metadataJson: unknown;
    try {
      metadataJson = JSON.parse(metadataEntry);
    } catch {
      return NextResponse.json({ error: "Metadata was not valid JSON." }, { status: 400 });
    }

    const parsedOwner = attachVaultPayloadSchema.safeParse(metadataJson);
    const isOwnerUpload =
      parsedOwner.success && verifyOwnerKey(parsedOwner.data.ownerKey, existing.ownerKey);

    let parsedContrib: ReturnType<typeof contributorAttachVaultPayloadSchema.safeParse> | null =
      null;
    if (!isOwnerUpload) {
      parsedContrib = contributorAttachVaultPayloadSchema.safeParse(metadataJson);
      if (!parsedContrib.success) {
        return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
      }
    }

    const cookieStore = await cookies();
    const vaultAccess = readVaultAccessFromCookies(cookieStore, slug);

    if (isOwnerUpload) {
      if (existing.ownerUserId) {
        const user = await getCurrentUser();
        if (!user) {
          return NextResponse.json(
            {
              error: "Sign in with the account that created this room to upload files.",
              code: "LOGIN_REQUIRED",
            },
            { status: 401 },
          );
        }
        if (user.id !== existing.ownerUserId) {
          return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
        }
      }
    } else {
      if (existing.status !== "active" || isVaultExpired(existing.expiresAt)) {
        return NextResponse.json(
          { error: "This Token room is no longer accepting uploads." },
          { status: 403 },
        );
      }

      if (!vaultAccess) {
        return NextResponse.json(
          {
            error: "Complete room access (NDA or email code) before uploading as a team member.",
            code: "ACCESS_REQUIRED",
          },
          { status: 403 },
        );
      }
      if (recipientVaultAccessRoleForEmail(existing, vaultAccess.signerEmail) !== "contributor") {
        return NextResponse.json(
          { error: "This address is not enabled to upload to this room." },
          { status: 403 },
        );
      }
    }

    const fileMeta = isOwnerUpload ? parsedOwner.data : parsedContrib!.data;

    if (!isSupportedFileType(fileMeta.mimeType)) {
      return NextResponse.json(
        { error: "Token currently supports PDF, Office, image, and text files." },
        { status: 400 },
      );
    }

    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());
    if (encryptedBuffer.byteLength > ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES) {
      return NextResponse.json({ error: "Encrypted file is too large." }, { status: 400 });
    }

    const existingList = vaultFilesList(existing);
    const incomingName = fileMeta.fileName.trim();
    const nameKey = vaultFileNameKey(incomingName);
    const matchIdx = existingList.findIndex((f) => vaultFileNameKey(f.name) === nameKey);

    const nowIso = new Date().toISOString();
    let isReplace = false;
    let targetFileId = crypto.randomUUID();
    let nextVersion = 1;
    let fileEntry: VaultFileEntry;

    if (matchIdx !== -1) {
      const prev = existingList[matchIdx]!;
      if (!isOwnerUpload) {
        const contrib = normalizeRecipientEmail(vaultAccess!.signerEmail);
        const prevUploader = prev.uploadedBySignerEmail
          ? normalizeRecipientEmail(prev.uploadedBySignerEmail)
          : null;
        if (!prevUploader || prevUploader !== contrib) {
          return NextResponse.json(
            {
              error:
                "A file with this name already exists. Use another name, ask the room owner to remove it, or only the person who uploaded it can publish a new version.",
              code: "FILE_NAME_CONFLICT",
            },
            { status: 409 },
          );
        }
      }
      isReplace = true;
      targetFileId = prev.id;
      nextVersion = (prev.contentVersion ?? 1) + 1;
      fileEntry = {
        id: prev.id,
        name: incomingName,
        mimeType: fileMeta.mimeType,
        sizeBytes: fileMeta.fileSize,
        addedAt: prev.addedAt ?? existing.createdAt,
        lastReplacedAt: nowIso,
        contentVersion: nextVersion,
        category: prev.category,
        salt: fileMeta.salt,
        iv: fileMeta.iv,
        pbkdf2Iterations: fileMeta.pbkdf2Iterations,
        ...(isOwnerUpload
          ? { uploadedBySignerEmail: undefined, uploadedByAcceptanceId: undefined }
          : {
              uploadedBySignerEmail: normalizeRecipientEmail(vaultAccess!.signerEmail),
              uploadedByAcceptanceId: vaultAccess!.acceptanceId,
            }),
      };
    } else {
      fileEntry = {
        id: targetFileId,
        name: incomingName,
        mimeType: fileMeta.mimeType,
        sizeBytes: fileMeta.fileSize,
        addedAt: nowIso,
        contentVersion: 1,
        salt: fileMeta.salt,
        iv: fileMeta.iv,
        pbkdf2Iterations: fileMeta.pbkdf2Iterations,
        ...(!isOwnerUpload && vaultAccess
          ? {
              uploadedBySignerEmail: normalizeRecipientEmail(vaultAccess.signerEmail),
              uploadedByAcceptanceId: vaultAccess.acceptanceId,
            }
          : {}),
      };
    }

    const nextFiles = isReplace
      ? existingList.map((f, i) => (i === matchIdx ? fileEntry : f))
      : [...existingList, fileEntry];
    const head = nextFiles[0];

    const nextMetadata: VaultRecord = {
      ...existing,
      hasEncryptedFile: true,
      fileName: head?.name ?? incomingName,
      mimeType: head?.mimeType ?? fileMeta.mimeType,
      fileSize: head?.sizeBytes ?? fileMeta.fileSize,
      salt: head?.salt ?? fileMeta.salt,
      iv: head?.iv ?? fileMeta.iv,
      pbkdf2Iterations: head?.pbkdf2Iterations ?? fileMeta.pbkdf2Iterations,
      vaultFiles: nextFiles.length ? nextFiles : undefined,
    };

    await storage.deleteVaultFile(slug, targetFileId);
    await storage.addVaultFile(slug, targetFileId, encryptedBuffer, nextMetadata);
    await storage.updateVaultMetadata(nextMetadata);

    const ctx = getRequestContext(request);
    const ownerUser =
      isOwnerUpload && existing.ownerUserId ? await getCurrentUser() : null;
    const actorFromOwner =
      ownerUser != null
        ? {
            actorName: ownerUser.email.split("@")[0] ?? ownerUser.email,
            actorEmail: ownerUser.email,
          }
        : {};
    const actorFromRecipient =
      vaultAccess && !isOwnerUpload
        ? {
            actorName: vaultAccess.signerName,
            actorEmail: vaultAccess.signerEmail,
            actorCompany: vaultAccess.signerCompany,
            actorAddress: vaultAccess.signerAddress,
          }
        : {};
    const primaryActorEmail = ownerUser?.email ?? (vaultAccess && !isOwnerUpload ? vaultAccess.signerEmail : undefined);

    const auditTail = [
      primaryActorEmail ? ` · ${primaryActorEmail}` : "",
      ctx.ipAddress ? ` · IP ${ctx.ipAddress}` : "",
      ctx.device ? ` · ${ctx.device}` : "",
    ].join("");

    await storage.appendEvent(
      slug,
      createEvent(isReplace ? "file_replaced" : "document_attached", {
        note: isReplace
          ? `Version ${nextVersion}: replaced «${incomingName}»${auditTail}`
          : `Added «${incomingName}»${auditTail}`,
        ...actorFromOwner,
        ...actorFromRecipient,
        ...ctx,
      }),
    );

    const latestMetadata = await storage.getVaultMetadata(slug);
    const events = await storage.getEvents(slug);

    return NextResponse.json({
      metadata: latestMetadata,
      events,
    });
  } catch (err) {
    console.error("[api/vaults/[slug]/payload] POST failed:", err);
    return NextResponse.json(
      { error: "Could not attach the document." },
      { status: 500 },
    );
  }
}

/** DELETE /api/vaults/[slug]/payload?fileId= — owner (ownerKey) or contributor (own uploads only). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId query parameter is required." }, { status: 400 });
  }

  const storage = getVaultStorage();
  const existing = await storage.getVaultMetadata(slug);
  if (!existing) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const files = vaultFilesList(existing);
  const targetFile = files.find((f) => f.id === fileId);
  if (!targetFile) {
    return NextResponse.json({ error: "File not found in this room." }, { status: 404 });
  }

  const ownerKey = searchParams.get("ownerKey") ?? "";
  const ownerOk = verifyOwnerKey(ownerKey, existing.ownerKey);

  if (ownerOk) {
    if (existing.ownerUserId) {
      const user = await getCurrentUser();
      if (!user || user.id !== existing.ownerUserId) {
        return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
      }
    }
  } else {
    const cookieStore = await cookies();
    const access = readVaultAccessFromCookies(cookieStore, slug);
    if (!access) {
      return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
    }
    if (recipientVaultAccessRoleForEmail(existing, access.signerEmail) !== "contributor") {
      return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
    }
    const uploader = targetFile.uploadedBySignerEmail
      ? normalizeRecipientEmail(targetFile.uploadedBySignerEmail)
      : null;
    if (!uploader || uploader !== normalizeRecipientEmail(access.signerEmail)) {
      return NextResponse.json(
        { error: "You can only remove files you uploaded to this room." },
        { status: 403 },
      );
    }
  }

  const remainingFiles = files.filter((f) => f.id !== fileId);
  const nextMetadata: VaultRecord = {
    ...existing,
    hasEncryptedFile: remainingFiles.length > 0,
    vaultFiles: remainingFiles.length ? remainingFiles : undefined,
    ...(remainingFiles[0]
      ? {
          fileName: remainingFiles[0].name,
          mimeType: remainingFiles[0].mimeType,
          fileSize: remainingFiles[0].sizeBytes,
          salt: remainingFiles[0].salt,
          iv: remainingFiles[0].iv,
          pbkdf2Iterations: remainingFiles[0].pbkdf2Iterations,
        }
      : {
          fileName: "No document yet",
          mimeType: "application/octet-stream",
          fileSize: 0,
          salt: "pending",
          iv: "pending",
          pbkdf2Iterations: 210_000,
        }),
  };

  await storage.deleteVaultFile(slug, fileId);
  await storage.updateVaultMetadata(nextMetadata);

  const ctx = getRequestContext(request);
  const cookieStore = await cookies();
  const accessForEvent = readVaultAccessFromCookies(cookieStore, slug);

  await storage.appendEvent(
    slug,
    createEvent("document_attached", {
      note: `File removed: ${targetFile.name}`,
      ...(accessForEvent && !ownerOk
        ? {
            actorName: accessForEvent.signerName,
            actorEmail: accessForEvent.signerEmail,
            actorCompany: accessForEvent.signerCompany,
            actorAddress: accessForEvent.signerAddress,
          }
        : {}),
      ...ctx,
    }),
  );

  return NextResponse.json({ metadata: nextMetadata });
}
