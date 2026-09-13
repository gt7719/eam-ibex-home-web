import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import {
  SITE_USER_SESSION_COOKIE,
  SITE_USER_SESSION_MAX_AGE,
  actionAttemptKey,
  actionIsLocked,
  clearActionFailures,
  createSiteUserSession,
  findSiteUserByEmail,
  normalizeEmail,
  recordActionFailure,
  verifySiteUserPassword,
} from "../../../lib/site-user-auth";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "И-мэйл болон нууц үгээ оруулна уу." }, { status: 400 });
  const key = await actionAttemptKey(request, "login", email);
  if (await actionIsLocked(key)) return NextResponse.json({ error: "Олон буруу оролдлого илэрлээ. 15 минутын дараа дахин оролдоно уу." }, { status: 429 });
  const user = await findSiteUserByEmail(email, true);
  const valid = user ? await verifySiteUserPassword(user, password) : false;
  if (!user || !valid) {
    const attempt = await recordActionFailure(key, 5, 15);
    return NextResponse.json({ error: attempt.locked ? "Олон буруу оролдлого илэрлээ. 15 минутын дараа дахин оролдоно уу." : "Нэвтрэх мэдээлэл буруу байна." }, { status: attempt.locked ? 429 : 401 });
  }
  if (user.email_status !== "verified") return NextResponse.json({ error: "Эхлээд и-мэйлээ баталгаажуулна уу.", code: "email_unverified" }, { status: 403 });
  if (user.locked_until && user.locked_until > new Date().toISOString()) return NextResponse.json({ error: "Бүртгэл түр түгжигдсэн байна." }, { status: 423 });
  if (!["active", "limited"].includes(user.account_status)) return NextResponse.json({ error: "Бүртгэл идэвхгүй байна. support@ibex.mn хаягтай холбогдоно уу." }, { status: 403 });
  await clearActionFailures(key);
  const token = await createSiteUserSession(user.id);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(SITE_USER_SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SITE_USER_SESSION_MAX_AGE });
  return response;
}
