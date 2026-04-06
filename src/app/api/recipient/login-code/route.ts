/**
 * POST /api/recipient/login-code
 *
 * Request body:  { email: string, slug: string }
 *
 * Looks up or creates a RecipientAccount for the email,
 * creates a 6-digit OTP, and emails it to the recipient.
 * Rate-limited via the shared auth rate limiter.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitKey } from "@/lib/dataroom/rate-limit";
import {
  createRecipientLoginCode,
  getOrCreateRecipientAccount,
} from "@/lib/dataroom/recipient-auth";
import { sendRecipientMagicCode } from "@/lib/dataroom/recipient-email";
import { getVaultStorage } from "@/lib/dataroom/storage";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  slug: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { email, slug } = parsed.data;

  // Rate limit by IP + email
  const rlKey = rateLimitKey(ip, email);
  const { allowed, retryAfter } = checkRateLimit(rlKey);
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
    // Ensure recipient account exists (created unverified)
    await getOrCreateRecipientAccount(email);

    // Create and store OTP
    const { code } = await createRecipientLoginCode(email, slug);

    // Fetch room title for the email
    let roomName = "your shared room";
    try {
      const storage = getVaultStorage();
      const meta = await storage.getVaultMetadata(slug);
      if (meta?.title) roomName = meta.title;
    } catch {
      // Non-fatal: email still goes out
    }

    const delivery = await sendRecipientMagicCode(email, code, roomName);

    return NextResponse.json({
      delivery: delivery.delivery === "sendgrid" ? "email" : "local",
      ...(delivery.delivery === "local" ? { debugCode: delivery.debugCode } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[recipient/login-code]", message, stack);

    const isDbError = message.includes("relation") || message.includes("does not exist") || message.includes("ECONNREFUSED");
    const hint = isDbError
      ? "Database tables may not be set up. Run `pnpm db:migrate` on the server."
      : "Unable to send access code. Try again.";

    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
