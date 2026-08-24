import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DIRECTUS_URL,
  canManageWebsiteAdmins,
  directusRoleName,
  displayName,
  getDirectusUser,
  isWebsiteAdmin,
} from "../../../lib/directus";

const secureCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("ibex_directus_access")?.value;
  const refreshToken = cookieStore.get("ibex_directus_refresh")?.value;
  let refreshed: { access_token?: string; refresh_token?: string; expires?: number } | null = null;

  let user = accessToken ? await getDirectusUser(accessToken) : null;
  if ((!user || !isWebsiteAdmin(user)) && refreshToken) {
    const refreshResponse = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, mode: "json" }),
      cache: "no-store",
    }).catch(() => null);

    if (refreshResponse?.ok) {
      const payload = (await refreshResponse.json()) as { data?: typeof refreshed };
      refreshed = payload.data || null;
      accessToken = refreshed?.access_token;
      user = accessToken ? await getDirectusUser(accessToken) : null;
    }
  }

  if (!user || !isWebsiteAdmin(user)) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.set("ibex_directus_access", "", { ...secureCookie, maxAge: 0 });
    response.cookies.set("ibex_directus_refresh", "", { ...secureCookie, maxAge: 0 });
    return response;
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      email: user.email,
      name: displayName(user),
      role: directusRoleName(user),
      canManageAdmins: canManageWebsiteAdmins(user),
    },
  });
  if (refreshed?.access_token) {
    response.cookies.set("ibex_directus_access", refreshed.access_token, {
      ...secureCookie,
      maxAge: Math.max(60, Math.floor((refreshed.expires || 900000) / 1000)),
    });
  }
  if (refreshed?.refresh_token) {
    response.cookies.set("ibex_directus_refresh", refreshed.refresh_token, {
      ...secureCookie,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
