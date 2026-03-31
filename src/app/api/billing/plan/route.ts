import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/dataroom/auth";
import { updateUserPlan, type OdrUser } from "@/lib/dataroom/auth-store";

const schema = z.object({
  plan: z.enum(["free", "plus", "unicorn"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const updated = await updateUserPlan(user.id, body.data.plan as OdrUser["plan"]);

  return NextResponse.json({ plan: updated?.plan ?? null });
}
