import { NextResponse } from "next/server";
import { z } from "zod";

import { createWorkspaceForUser } from "@/lib/filmia/auth-store";
import { getCurrentUser } from "@/lib/filmia/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  companyName: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add a workspace name and company name." },
      { status: 400 },
    );
  }

  const workspace = await createWorkspaceForUser(user.id, parsed.data);

  return NextResponse.json({ workspace });
}
