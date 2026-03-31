import { NextResponse } from "next/server";

import { sessionCookieName } from "@/lib/dataroom/session";

function logout(request: Request) {
  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete(sessionCookieName);
  return response;
}

export async function POST(request: Request) {
  return logout(request);
}

export async function GET(request: Request) {
  return logout(request);
}
