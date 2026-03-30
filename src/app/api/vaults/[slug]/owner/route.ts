import { NextResponse } from "next/server";
import { z } from "zod";

import { syncWorkspaceRoomStatus } from "@/lib/filmia/auth";
import { getVaultStorage } from "@/lib/filmia/storage";
import { createEvent } from "@/lib/filmia/types";

export const runtime = "nodejs";

const ownerActionSchema = z.object({
  ownerKey: z.string().min(1),
  action: z.enum(["revoke", "restore"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const parsed = ownerActionSchema.safeParse(await request.json());

  if (!parsed.success || parsed.data.ownerKey !== metadata.ownerKey) {
    return NextResponse.json({ error: "Owner access denied." }, { status: 403 });
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
        userAgent: request.headers.get("user-agent") ?? undefined,
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
