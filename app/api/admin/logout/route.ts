import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, deleteAdminSession } from "../../../lib/site-admin";

export async function POST() {
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
