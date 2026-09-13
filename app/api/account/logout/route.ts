import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { SITE_USER_SESSION_COOKIE, revokeSiteUserSession } from "../../../lib/site-user-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const cookieStore = await cookies();
  await revokeSiteUserSession(cookieStore.get(SITE_USER_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SITE_USER_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
