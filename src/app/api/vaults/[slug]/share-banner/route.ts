import { NextResponse } from "next/server";

import { isVaultExpired } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";
import { SHARE_BANNER_MAX_BYTES } from "@/lib/dataroom/types";

export const runtime = "nodejs";

const ALLOWED_BANNER_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sniffImageMime(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

function mimeFromFileName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

/**
 * Owner upload: multipart form (field `file` + `ownerKey`) — avoids huge JSON/base64 bodies
 * that hit the default Next.js ~1 MB request limit.
 */
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read upload. Try a smaller file (max 3 MB) or a JPEG/PNG/WebP." },
      { status: 400 },
    );
  }

  const ownerKey = form.get("ownerKey");
  if (typeof ownerKey !== "string" || !verifyOwnerKey(ownerKey, metadata.ownerKey)) {
    return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > SHARE_BANNER_MAX_BYTES) {
    return NextResponse.json({ error: "Banner must be 3 MB or smaller." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0 || bytes.length > SHARE_BANNER_MAX_BYTES) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  let mimeType = (file.type || "").toLowerCase();
  if (!mimeType || mimeType === "application/octet-stream") {
    mimeType = mimeFromFileName(file.name) ?? sniffImageMime(bytes) ?? "";
  }
  if (!ALLOWED_BANNER_MIMES.has(mimeType)) {
    return NextResponse.json({ error: "Use JPEG, PNG, or WebP." }, { status: 400 });
  }

  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  const safeName = file.name.trim().slice(0, 160) || `room-banner.${ext}`;

  await storage.putShareBanner(slug, bytes);
  const nextMetadata = {
    ...metadata,
    shareBanner: {
      fileName: safeName,
      mimeType,
      sizeBytes: bytes.length,
    },
  };
  await storage.updateVaultMetadata(nextMetadata);
  const latest = await storage.getVaultMetadata(slug);
  return NextResponse.json({ metadata: latest });
}

/**
 * Public image bytes for room branding on `/s/[slug]`.
 * No NDA or access cookie — only checks room exists, is active, and is not expired.
 */
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
  if (metadata.status !== "active" || isVaultExpired(metadata.expiresAt)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const bannerMeta = metadata.shareBanner;
  if (!bannerMeta) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const bytes = await storage.getShareBanner(slug);
  if (!bytes) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": bannerMeta.mimeType,
      "cache-control": "public, max-age=3600",
    },
  });
}
