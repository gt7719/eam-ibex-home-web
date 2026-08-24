import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSession } from "../../../lib/site-admin";

export async function GET() {
  const user = await getAdminSession();
  if (!user) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
  return NextResponse.json({ authenticated: true, user });
}
