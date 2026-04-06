import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitKey } from "@/lib/dataroom/rate-limit";
import { getWorkspaceForUser, normalizeEmail, verifyLoginCode } from "@/lib/dataroom/auth-store";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/dataroom/session";

const schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(6).max(6),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const rlKey = rateLimitKey(ip, email);
  const { allowed, remaining, retryAfter } = checkRateLimit(rlKey);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a moment before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let user;
  try {
    user = await verifyLoginCode(email, parsed.data.code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("[verify-code]", message);
    return NextResponse.json({ error: "Unable to verify code. Try again." }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Code expired or incorrect." }, { status: 401 });
  }

  let workspace;
  try {
    workspace = await getWorkspaceForUser(user.id);
  } catch (err) {
    console.error("[verify-code] getWorkspaceForUser failed:", err);
    workspace = null;
  }

  const response = NextResponse.json({ hasWorkspace: Boolean(workspace) });

  try {
    response.cookies.set(
      sessionCookieName,
      createSessionToken({ userId: user.id, email: user.email }),
      sessionCookieOptions,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-code] session cookie:", message);
    return NextResponse.json({ error: "Unable to create session. Try again." }, { status: 500 });
  }

  return response;
}
