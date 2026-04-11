import { NextResponse } from "next/server";

import {
  createSigningCertificateFilename,
  renderDocumentSigningCertificateHtml,
} from "@/lib/dataroom/signing-certificate-html";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { verifySigningInviteToken } from "@/lib/dataroom/signing-invite-token";
import { vaultFilesList } from "@/lib/dataroom/types";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; requestId: string }> },
) {
  const { slug, requestId } = await params;
  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const ownerKey = url.searchParams.get("key");
  const token = url.searchParams.get("token") ?? "";

  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);
  if (!metadata) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const signingRequest = (metadata.signingRequests ?? []).find((r) => r.id === requestId) ?? null;
  if (!signingRequest || signingRequest.status !== "completed") {
    return NextResponse.json(
      { error: "Certificate is available when all signers have finished." },
      { status: 404 },
    );
  }

  const file = vaultFilesList(metadata).find((f) => f.id === signingRequest.fileId);
  const fileName = file?.name ?? "document.pdf";

  let authorized = false;
  if (ownerKey && verifyOwnerKey(ownerKey, metadata.ownerKey)) {
    authorized = true;
  } else {
    const payload = verifySigningInviteToken(token, slug, requestId);
    if (payload) {
      const signer = signingRequest.signers.find((s) => s.id === payload.signerId);
      if (signer?.status === "signed") {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Certificate access denied." }, { status: 403 });
  }

  const html = renderDocumentSigningCertificateHtml(metadata, signingRequest, fileName);
  const filename = createSigningCertificateFilename(metadata, signingRequest, fileName);

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
