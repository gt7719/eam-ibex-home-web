import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  findAdminByEmail,
  verifyPassword,
} from "../../../lib/site-admin";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !body.password) {
    return NextResponse.json({ error: "И-мэйл болон нууц үгээ оруулна уу." }, { status: 400 });
  }
  const user = await findAdminByEmail(email);
  const valid = user?.password_hash && user?.password_salt
    ? await verifyPassword(body.password, user.password_salt, user.password_hash)
    : false;
  if (!user || !valid || user.status !== "active") {
    return NextResponse.json(
      { error: "Нэвтрэх мэдээлэл буруу эсвэл хэрэглэгчийн эрх идэвхгүй байна." },
      { status: 401 },
    );
  }
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
