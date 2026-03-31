import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentWorkspace, recordWorkspaceRoom } from "@/lib/dataroom/auth";
import { addDays, buildDefaultNdaText, createOwnerKey, createPublicSlug } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  createEvent,
  createVaultSchema,
  isSupportedFileType,
  type VaultRecord,
} from "@/lib/dataroom/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const workspace = await getCurrentWorkspace();

    if (!user || !workspace) {
      return NextResponse.json({ error: "Login and workspace required." }, { status: 401 });
    }

    const formData = await request.formData();
    const metadataEntry = formData.get("metadata");
    const encryptedFile = formData.get("encryptedFile");

    if (typeof metadataEntry !== "string" || !(encryptedFile instanceof File)) {
      return NextResponse.json(
        { error: "Upload metadata and encrypted file are both required." },
        { status: 400 },
      );
    }

    const parsed = createVaultSchema.safeParse(JSON.parse(metadataEntry));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Some required room details are missing or invalid." },
        { status: 400 },
      );
    }

    if (!isSupportedFileType(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: "OpenDataRoom currently supports PDF, Office, image, and text files." },
        { status: 400 },
      );
    }

    const slug = createPublicSlug();
    const ownerKey = createOwnerKey();
    const createdAt = new Date().toISOString();
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
      ndaVersion: parsed.data.requiresNda ? "odr-standard-v1" : "none",
      status: "active",
      createdAt,
      expiresAt: addDays(parsed.data.expiresInDays),
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      fileSize: parsed.data.fileSize,
      salt: parsed.data.salt,
      iv: parsed.data.iv,
      pbkdf2Iterations: parsed.data.pbkdf2Iterations,
    };

    const encryptedBuffer = Buffer.from(await encryptedFile.arrayBuffer());
    const storage = getVaultStorage();

    await storage.saveVault(metadata, encryptedBuffer);
    await storage.appendEvent(
      slug,
      createEvent("created", {
        actorName: metadata.senderName,
        note: "Secure OpenDataRoom room created",
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
  } catch {
    return NextResponse.json(
      { error: "OpenDataRoom could not create the room right now." },
      { status: 500 },
    );
  }
}
