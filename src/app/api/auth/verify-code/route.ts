import { NextResponse } from "next/server";
import { z } from "zod";

import { getWorkspaceForUser, normalizeEmail, verifyLoginCode } from "@/lib/filmia/auth-store";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/filmia/session";

const schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(6).max(6),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 });
  }

  const user = await verifyLoginCode(normalizeEmail(parsed.data.email), parsed.data.code);

  if (!user) {
    return NextResponse.json({ error: "Code expired or incorrect." }, { status: 401 });
  }

  const workspace = await getWorkspaceForUser(user.id);
  const response = NextResponse.json({ hasWorkspace: Boolean(workspace) });

  response.cookies.set(
    sessionCookieName,
    createSessionToken({
      userId: user.id,
      email: user.email,
    }),
    sessionCookieOptions,
  );

  return response;
}
