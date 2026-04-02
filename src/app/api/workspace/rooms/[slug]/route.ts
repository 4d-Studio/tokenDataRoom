import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentWorkspace, deleteWorkspaceRoom } from "@/lib/dataroom/auth";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const { slug } = await params;
  if (!isValidPublicVaultSlug(slug)) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (metadata.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Not your room" }, { status: 403 });
  }

  await storage.deleteVault(slug);
  await deleteWorkspaceRoom(workspace.id, metadata.id);

  return NextResponse.json({ deleted: true });
}
