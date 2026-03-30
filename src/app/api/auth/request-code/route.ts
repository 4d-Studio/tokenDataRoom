import { NextResponse } from "next/server";
import { z } from "zod";

import { createLoginCode, normalizeEmail } from "@/lib/filmia/auth-store";
import { sendMagicCode } from "@/lib/filmia/magic-link";

const schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const { code } = await createLoginCode(email);
  const delivery = await sendMagicCode(email, code);

  return NextResponse.json(delivery);
}
