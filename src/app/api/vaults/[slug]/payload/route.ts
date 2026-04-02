import { NextResponse } from "next/server";

import { getCurrentUser, syncWorkspaceRoomFileName } from "@/lib/dataroom/auth";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  attachVaultPayloadSchema,
  createEvent,
  ENCRYPTED_VAULT_PAYLOAD_MAX_BYTES,
  isSupportedFileType,
  type VaultRecord,
} from "@/lib/dataroom/types";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";
export const maxDuration = 120;

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

    if (existing.hasEncryptedFile !== false) {
      return NextResponse.json(
        { error: "This room already has a document. Replace is not supported yet." },
        { status: 409 },
      );
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

    const nextMetadata: VaultRecord = {
      ...existing,
      hasEncryptedFile: true,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      salt: parsed.data.salt,
      iv: parsed.data.iv,
      pbkdf2Iterations: parsed.data.pbkdf2Iterations,
    };

    await storage.putEncryptedPayload(slug, encryptedBuffer);
    await storage.updateVaultMetadata(nextMetadata);
    await storage.appendEvent(
      slug,
      createEvent("document_attached", {
        note: `Document attached: ${parsed.data.fileName}`,
        userAgent: request.headers.get("user-agent") ?? undefined,
      }),
    );

    if (existing.workspaceId) {
      await syncWorkspaceRoomFileName(existing.workspaceId, existing.id, parsed.data.fileName);
    }

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
