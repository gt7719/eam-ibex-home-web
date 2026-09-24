import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  getSiteUserSession,
  normalizeLocale,
} from "../../../lib/site-user-auth";
import { readJsonObject } from "../../../lib/http-input";

const headers = { "Cache-Control": "no-store" };

function normalizedName(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 160)
    : "";
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json(
      { error: "Origin mismatch" },
      { status: 403, headers },
    );
  const user = await getSiteUserSession();
  if (!user)
    return NextResponse.json(
      { error: "Нэвтрэх шаардлагатай." },
      { status: 401, headers },
    );
  const parsedBody = await readJsonObject<{
    fullName?: unknown;
    locale?: unknown;
  }>(request, 8_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status, headers });
  const body = parsedBody.value;
  const fullName = normalizedName(body.fullName);
  if (fullName.length < 2)
    return NextResponse.json(
      { error: "Нэрээ бүрэн оруулна уу." },
      { status: 400, headers },
    );
  const locale = normalizeLocale(body.locale);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE site_users SET full_name=?,locale=?,updated_at=? WHERE id=?",
  )
    .bind(fullName, locale, now, user.id)
    .run();
  return NextResponse.json(
    { saved: true, user: { ...user, fullName, locale } },
    { headers },
  );
}
