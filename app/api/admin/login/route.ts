import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  findAdminByEmail,
  verifyPassword,
} from "../../../lib/site-admin";
import { clearLoginFailures, hasTrustedOrigin, loginAttemptKey, loginIsLocked, recordLoginFailure } from "../../../lib/admin-security";
import { readJsonObject } from "../../../lib/http-input";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const parsedBody = await readJsonObject<{ email?: string; password?: string }>(request, 8_000);
  if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  const body = parsedBody.value;
  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !body.password) {
    return NextResponse.json({ error: "И-мэйл болон нууц үгээ оруулна уу." }, { status: 400 });
  }
  const attemptKey = await loginAttemptKey(request, email);
  if (await loginIsLocked(attemptKey)) {
    return NextResponse.json({ error: "Олон удаагийн буруу оролдлого илэрлээ. 15 минутын дараа дахин оролдоно уу." }, { status: 429 });
  }
  const user = await findAdminByEmail(email);
  const valid = user?.password_hash && user?.password_salt
    ? await verifyPassword(body.password, user.password_salt, user.password_hash)
    : false;
  if (!user || !valid || user.status !== "active") {
    const throttle = await recordLoginFailure(attemptKey);
    return NextResponse.json(
      { error: throttle.locked ? "Олон удаагийн буруу оролдлого илэрлээ. 15 минутын дараа дахин оролдоно уу." : "Нэвтрэх мэдээлэл буруу эсвэл хэрэглэгчийн эрх идэвхгүй байна." },
      { status: throttle.locked ? 429 : 401 },
    );
  }
  await clearLoginFailures(attemptKey);
  const token = await createAdminSession(user.id);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}
