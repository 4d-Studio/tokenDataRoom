import { NextResponse } from "next/server";

import { getPublicAppBaseUrl } from "@/lib/dataroom/helpers";
import { sessionCookieName } from "@/lib/dataroom/session";

function logout(request: Request) {
  const loginUrl = new URL("/login", `${getPublicAppBaseUrl(request)}/`);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(sessionCookieName);
  return response;
}

export async function POST(request: Request) {
  return logout(request);
}

export async function GET(request: Request) {
  return logout(request);
}
