import { NextResponse } from "next/server";

import {
  getCurrentUser,
  getCurrentWorkspace,
  recordWorkspaceRoom,
} from "@/lib/dataroom/auth";
import { addDays, buildDefaultNdaText, createOwnerKey, createPublicSlug } from "@/lib/dataroom/helpers";
import { isS3VaultConfigured } from "@/lib/dataroom/s3-vault-storage";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  createEvent,
  createVaultRoomSchema,
  createVaultSchema,
  isSupportedFileType,
  type VaultRecord,
} from "@/lib/dataroom/types";

export const runtime = "nodejs";
/** Large PDFs / Office files after client-side encryption */
export const maxDuration = 120;

function emptyRoomPlaceholderFields(): Pick<
  VaultRecord,
  "fileName" | "mimeType" | "fileSize" | "salt" | "iv" | "pbkdf2Iterations"
> {
  return {
    fileName: "No document yet",
    mimeType: "application/octet-stream",
    fileSize: 0,
    salt: "pending",
    iv: "pending",
    pbkdf2Iterations: 210_000,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const workspace = await getCurrentWorkspace();

    if (!user || !workspace) {
      return NextResponse.json({ error: "Login and workspace required." }, { status: 401 });
    }

    const formData = await request.formData();
    const metadataEntry = formData.get("metadata");
    const encryptedFileRaw = formData.get("encryptedFile");

    if (typeof metadataEntry !== "string") {
      return NextResponse.json({ error: "Room metadata is required." }, { status: 400 });
    }

    let metadataJson: unknown;
    try {
      metadataJson = JSON.parse(metadataEntry);
    } catch {
      return NextResponse.json({ error: "Room metadata was not valid JSON." }, { status: 400 });
    }

    const hasEncryptedUpload =
      encryptedFileRaw instanceof File && encryptedFileRaw.size > 0;

    const storage = getVaultStorage();
    const slug = createPublicSlug();
    const ownerKey = createOwnerKey();
    const createdAt = new Date().toISOString();

    if (!hasEncryptedUpload) {
      const parsed = createVaultRoomSchema.safeParse(metadataJson);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Some required room details are missing or invalid." },
          { status: 400 },
        );
      }

      const metadata: VaultRecord = {
        id: crypto.randomUUID(),
        slug,
        ownerKey,
        ownerUserId: user.id,
        workspaceId: workspace.id,
        title: parsed.data.title,
        senderName: parsed.data.senderName,
        senderCompany: parsed.data.senderCompany || undefined,
        message: parsed.data.message || undefined,
        requiresNda: parsed.data.requiresNda,
        ndaText: parsed.data.requiresNda
          ? parsed.data.ndaText ||
            buildDefaultNdaText(parsed.data.senderCompany || workspace.companyName)
          : undefined,
        ndaVersion: parsed.data.requiresNda ? "tkn-standard-v1" : "none",
        status: "active",
        createdAt,
        expiresAt: addDays(parsed.data.expiresInDays),
        hasEncryptedFile: false,
        ...emptyRoomPlaceholderFields(),
      };

      await storage.saveVault(metadata, null);
      await storage.appendEvent(
        slug,
        createEvent("created", {
          actorName: metadata.senderName,
          note: "Token room created — add a document from owner controls",
          userAgent: request.headers.get("user-agent") ?? undefined,
        }),
      );
      await recordWorkspaceRoom(workspace.id, {
        id: metadata.id,
        slug,
        title: metadata.title,
        fileName: metadata.fileName,
        senderName: metadata.senderName,
        createdAt,
        status: metadata.status,
      });

      const baseUrl = new URL(request.url).origin;

      return NextResponse.json({
        slug,
        shareUrl: `${baseUrl}/s/${slug}`,
        manageUrl: `${baseUrl}/m/${slug}?key=${ownerKey}`,
      });
    }

    const parsed = createVaultSchema.safeParse(metadataJson);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Some required room details are missing or invalid." },
        { status: 400 },
      );
    }

    if (!isSupportedFileType(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: "Token currently supports PDF, Office, image, and text files." },
        { status: 400 },
      );
    }

    const metadata: VaultRecord = {
      id: crypto.randomUUID(),
      slug,
      ownerKey,
      ownerUserId: user.id,
      workspaceId: workspace.id,
      title: parsed.data.title,
      senderName: parsed.data.senderName,
      senderCompany: parsed.data.senderCompany || undefined,
      message: parsed.data.message || undefined,
      requiresNda: parsed.data.requiresNda,
      ndaText: parsed.data.requiresNda
        ? parsed.data.ndaText ||
          buildDefaultNdaText(parsed.data.senderCompany || workspace.companyName)
        : undefined,
      ndaVersion: parsed.data.requiresNda ? "tkn-standard-v1" : "none",
      status: "active",
      createdAt,
      expiresAt: addDays(parsed.data.expiresInDays),
      hasEncryptedFile: true,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      salt: parsed.data.salt,
      iv: parsed.data.iv,
      pbkdf2Iterations: parsed.data.pbkdf2Iterations,
    };

    const encryptedBuffer = Buffer.from(await encryptedFileRaw.arrayBuffer());

    await storage.saveVault(metadata, encryptedBuffer);
    await storage.appendEvent(
      slug,
      createEvent("created", {
        actorName: metadata.senderName,
        note: "Secure Token room created",
        userAgent: request.headers.get("user-agent") ?? undefined,
      }),
    );
    await recordWorkspaceRoom(workspace.id, {
      id: metadata.id,
      slug,
      title: metadata.title,
      fileName: metadata.fileName,
      senderName: metadata.senderName,
      createdAt,
      status: metadata.status,
    });

    const baseUrl = new URL(request.url).origin;

    return NextResponse.json({
      slug,
      shareUrl: `${baseUrl}/s/${slug}`,
      manageUrl: `${baseUrl}/m/${slug}?key=${ownerKey}`,
    });
  } catch (err) {
    console.error("[api/vaults] POST failed:", err);
    const hint =
      process.env.BLOB_READ_WRITE_TOKEN?.trim() || isS3VaultConfigured()
        ? ""
        : " Configure a Railway Bucket (S3 env vars), BLOB_READ_WRITE_TOKEN, or a writable TKN_LOCAL_VAULT_DIR.";
    return NextResponse.json(
      {
        error: `Token could not create the room right now.${hint}`.trim(),
      },
      { status: 500 },
    );
  }
}
