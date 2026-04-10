import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dataroom/auth";
import { getRequestContext } from "@/lib/dataroom/request-context";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  attachVaultPayloadSchema,
  createEvent,
  ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES,
  isSupportedFileType,
  type VaultFileEntry,
  type VaultRecord,
  vaultFilesList,
} from "@/lib/dataroom/types";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";

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

/** POST /api/vaults/[slug]/payload — add a new encrypted file to the vault. */
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

    const parsed = attachVaultPayloadSchema.safeParse(metadataJson);

    if (!parsed.success || !verifyOwnerKey(parsed.data.ownerKey, existing.ownerKey)) {
      return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
    }

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

    if (!isSupportedFileType(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: "Token currently supports PDF, Office, image, and text files." },
        { status: 400 },
      );
    }

    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());
    if (encryptedBuffer.byteLength > ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES) {
      return NextResponse.json({ error: "Encrypted file is too large." }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    const addedAt = new Date().toISOString();
    const fileEntry: VaultFileEntry = {
      id: fileId,
      name: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.fileSize,
      addedAt,
      salt: parsed.data.salt,
      iv: parsed.data.iv,
      pbkdf2Iterations: parsed.data.pbkdf2Iterations,
    };

    const nextMetadata: VaultRecord = {
      ...existing,
      // Maintain legacy fields for backward compat with old recipients
      hasEncryptedFile: true,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      salt: parsed.data.salt,
      iv: parsed.data.iv,
      pbkdf2Iterations: parsed.data.pbkdf2Iterations,
      // New multi-file array
      vaultFiles: [...vaultFilesList(existing), fileEntry],
    };

    await storage.addVaultFile(slug, fileId, encryptedBuffer, nextMetadata);
    await storage.updateVaultMetadata(nextMetadata);
    await storage.appendEvent(
      slug,
      createEvent("document_attached", {
        note: `File added: ${parsed.data.fileName}`,
        ...getRequestContext(request),
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

/** DELETE /api/vaults/[slug]/payload?fileId= — remove a file from the vault (owner only). */
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

  const ownerKey = searchParams.get("ownerKey") ?? "";
  if (!verifyOwnerKey(ownerKey, existing.ownerKey)) {
    return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
  }

  if (existing.ownerUserId) {
    const user = await getCurrentUser();
    if (!user || user.id !== existing.ownerUserId) {
      return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
    }
  }

  const files = vaultFilesList(existing);
  const targetFile = files.find((f) => f.id === fileId);
  if (!targetFile) {
    return NextResponse.json({ error: "File not found in this room." }, { status: 404 });
  }

  const remainingFiles = files.filter((f) => f.id !== fileId);
  const nextMetadata: VaultRecord = {
    ...existing,
    hasEncryptedFile: remainingFiles.length > 0,
    vaultFiles: remainingFiles.length ? remainingFiles : undefined,
    // Keep legacy fields pointing at the first remaining file (backward compat)
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
  await storage.appendEvent(
    slug,
    createEvent("document_attached", {
      note: `File removed: ${targetFile.name}`,
      ...getRequestContext(request),
    }),
  );

  return NextResponse.json({ metadata: nextMetadata });
}
