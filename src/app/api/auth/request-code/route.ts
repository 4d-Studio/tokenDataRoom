import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitKey } from "@/lib/dataroom/rate-limit";
import { createLoginCode, normalizeEmail } from "@/lib/dataroom/auth-store";
import { sendMagicCode } from "@/lib/dataroom/magic-link";

const schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const rlKey = rateLimitKey(ip, email);
  const { allowed, remaining, retryAfter } = checkRateLimit(rlKey);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter ?? 60),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    const { code } = await createLoginCode(email);
    const delivery = await sendMagicCode(email, code);

    return NextResponse.json(
      { ...delivery, remainingRequests: remaining },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("[request-code]", message);
    return NextResponse.json({ error: "Unable to send code. Try again." }, { status: 500 });
  }
}
