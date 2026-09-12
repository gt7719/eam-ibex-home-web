import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, deleteAdminSession } from "../../../lib/site-admin";
import { hasTrustedOrigin } from "../../../lib/admin-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const cookieStore = await cookies();
  await deleteAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
