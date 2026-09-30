import { NextResponse } from "next/server";
import { env } from "@/app/runtime/env";
import { SITE_USER_SESSION_COOKIE, getSiteUserSession } from "../../../lib/site-user-auth";
import { profileImageUrl } from "../../../lib/site-user-profile";

export async function GET() {
  const user = await getSiteUserSession();
  if (user) {
    const image = await env.DB.prepare("SELECT id FROM site_user_profile_images WHERE user_id=? LIMIT 1").bind(user.id).first<{ id: string }>();
    return NextResponse.json({ authenticated: true, user: { ...user, profileImageUrl: image ? profileImageUrl(user.id) : null } }, { headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SITE_USER_SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
