import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DIRECTUS_URL } from "../../../lib/directus";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("ibex_directus_refresh")?.value;
  if (refreshToken) {
    await fetch(`${DIRECTUS_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({ authenticated: false });
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set("ibex_directus_access", "", cookieOptions);
  response.cookies.set("ibex_directus_refresh", "", cookieOptions);
  return response;
}
