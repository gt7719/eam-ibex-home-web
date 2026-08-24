import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  authenticatedSiteIdentity,
  countAdmins,
  createAdminSession,
  hashPassword,
  isValidEmail,
} from "../../../lib/site-admin";

export async function GET(request: Request) {
  const needsSetup = (await countAdmins()) === 0;
  const identity = needsSetup ? authenticatedSiteIdentity(request) : null;
  return NextResponse.json({
    needsSetup,
    eligible: Boolean(identity),
    identity: identity ? { email: identity.email, name: identity.name } : null,
  });
}

export async function POST(request: Request) {
  if ((await countAdmins()) !== 0) {
    return NextResponse.json({ error: "Үндсэн админ аль хэдийн үүссэн байна." }, { status: 409 });
  }
  const identity = authenticatedSiteIdentity(request);
  if (!identity) {
    return NextResponse.json(
      { error: "Үндсэн админыг зөвхөн сайтын баталгаажсан эзэмшигч үүсгэнэ." },
      { status: 403 },
    );
  }
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() || identity.email;
  const name = body.name?.trim() || identity.name;
  const password = body.password || "";
  if (email !== identity.email || !isValidEmail(email) || name.length < 2 || password.length < 10) {
    return NextResponse.json(
      { error: "Баталгаажсан и-мэйл, нэр болон 10-аас дээш тэмдэгттэй нууц үг шаардлагатай." },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const credential = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO admin_users
     (id, email, name, password_hash, password_salt, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, ?)`,
  )
    .bind(userId, email, name, credential.hash, credential.salt, now, now)
    .run();
  const token = await createAdminSession(userId);
  const response = NextResponse.json({ created: true, authenticated: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}
