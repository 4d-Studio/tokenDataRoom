import { NextResponse } from "next/server";

import {
  getCurrentUser,
  getCurrentWorkspace,
  recordWorkspaceRoom,
} from "@/lib/dataroom/auth";
import { getRequestContext } from "@/lib/dataroom/request-context";
import {
  addDays,
  buildDefaultNdaText,
  createOwnerKey,
  createPublicSlug,
  getPublicAppBaseUrl,
} from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  createEvent,
  createVaultRoomSchema,
  createVaultSchema,
  isSupportedFileType,
  type VaultRecord,
} from "@/lib/dataroom/types";
import { vaultCreateFailureResponse } from "@/lib/dataroom/vault-create-errors";

export const runtime = "nodejs";
/** Large PDFs / Office files after client-side encryption */
export const maxDuration = 120;

type WorkspaceForNda = { companyName: string; ndaTemplate?: string };

function resolveVaultNdaText(
  requiresNda: boolean,
  fields: {
    ndaText: string;
    ndaDisclosingParty: string;
    ndaReceivingParty: string;
    senderCompany: string;
  },
  workspace: WorkspaceForNda,
): { ok: true; ndaText: string | undefined } | { ok: false; error: string } {
  if (!requiresNda) return { ok: true, ndaText: undefined };
  const trimmed = fields.ndaText.trim();
  if (trimmed) return { ok: true, ndaText: trimmed };
  const template = workspace.ndaTemplate?.trim();
  if (template) return { ok: true, ndaText: template };
  const d =
    fields.ndaDisclosingParty.trim() ||
    fields.senderCompany.trim() ||
    workspace.companyName.trim();
  const r = fields.ndaReceivingParty.trim();
  if (d.length < 2 || r.length < 2) {
    return {
      ok: false,
      error:
        "NDA is required: enter both the disclosing party and the other party, or paste a full NDA.",
    };
  }
  return { ok: true, ndaText: buildDefaultNdaText({ disclosingParty: d, receivingParty: r }) };
}

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

      const ndaResolved = resolveVaultNdaText(parsed.data.requiresNda, parsed.data, workspace);
      if (!ndaResolved.ok) {
        return NextResponse.json({ error: ndaResolved.error }, { status: 400 });
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
        ndaText: ndaResolved.ndaText,
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
          note: "Token.FYI room created — add a document from owner controls",
          ...getRequestContext(request),
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
        ownerKey,
      });

      const baseUrl = getPublicAppBaseUrl(request);

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

    const ndaResolved = resolveVaultNdaText(parsed.data.requiresNda, parsed.data, workspace);
    if (!ndaResolved.ok) {
      return NextResponse.json({ error: ndaResolved.error }, { status: 400 });
    }

    if (!isSupportedFileType(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: "Token.FYI currently supports PDF, Office, image, and text files." },
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
      ndaText: ndaResolved.ndaText,
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
        note: "Secure Token.FYI room created",
        ...getRequestContext(request),
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
      ownerKey,
    });

    const baseUrl = getPublicAppBaseUrl(request);

    return NextResponse.json({
      slug,
      shareUrl: `${baseUrl}/s/${slug}`,
      manageUrl: `${baseUrl}/m/${slug}?key=${ownerKey}`,
    });
  } catch (err) {
    console.error("[api/vaults] POST failed:", err);
    const { status, body } = vaultCreateFailureResponse(err);
    return NextResponse.json(body, { status });
  }
}
