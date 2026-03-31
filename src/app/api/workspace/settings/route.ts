import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/dataroom/auth";
import { getWorkspaceForUser, updateWorkspace } from "@/lib/dataroom/auth-store";

const patchSchema = z.object({
  ndaTemplate: z.string().max(12_000).optional(),
  logoUrl: z.string().max(500_000).optional(), // base64 data URL or external URL
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const body = patchSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid input", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const { logoUrl } = body.data;

  // Validate logoUrl is a safe image format
  if (logoUrl !== undefined) {
    const isDataUrl = logoUrl.startsWith("data:image/");
    const isHttpUrl =
      logoUrl.startsWith("https://") &&
      (logoUrl.includes("vercel-blob.com") || logoUrl.includes("public-"));

    if (!isDataUrl && !isHttpUrl) {
      return NextResponse.json(
        { error: "Logo must be a data URL or an approved external URL." },
        { status: 400 },
      );
    }
  }

  const updated = await updateWorkspace(workspace.id, {
    ndaTemplate: body.data.ndaTemplate,
    logoUrl,
  });

  return NextResponse.json({ workspace: updated });
}
