import { NextResponse } from "next/server";
import { SITE_USER_SESSION_COOKIE, getSiteUserSession } from "../../../lib/site-user-auth";

export async function GET() {
  const user = await getSiteUserSession();
  if (user) return NextResponse.json({ authenticated: true, user }, { headers: { "Cache-Control": "no-store" } });
  const response = NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SITE_USER_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
