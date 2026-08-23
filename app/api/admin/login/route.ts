import { NextResponse } from "next/server";
import { DIRECTUS_URL, getDirectusUser, isWebsiteAdmin } from "../../../lib/directus";

const secureCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json({ error: "И-мэйл болон нууц үгээ оруулна уу." }, { status: 400 });
  }

  const directusResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email.trim(), password: body.password, mode: "json" }),
    cache: "no-store",
  }).catch(() => null);

  if (!directusResponse?.ok) {
    return NextResponse.json(
      { error: "Нэвтрэх мэдээлэл буруу эсвэл Directus сервертэй холбогдсонгүй." },
      { status: 401 },
    );
  }

  const payload = (await directusResponse.json()) as {
    data?: { access_token?: string; refresh_token?: string; expires?: number };
  };
  const accessToken = payload.data?.access_token;
  const refreshToken = payload.data?.refresh_token;
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Directus нэвтрэлтийн token ирсэнгүй." }, { status: 502 });
  }

  const user = await getDirectusUser(accessToken);
  if (!isWebsiteAdmin(user)) {
    return NextResponse.json(
      { error: "Энэ хэрэглэгч Website Content Editor эрхгүй байна." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set("ibex_directus_access", accessToken, {
    ...secureCookie,
    maxAge: Math.max(60, Math.floor((payload.data?.expires || 900000) / 1000)),
  });
  response.cookies.set("ibex_directus_refresh", refreshToken, {
    ...secureCookie,
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
