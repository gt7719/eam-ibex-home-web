import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  authenticatedSiteIdentity,
  countAdmins,
  createInitialAdminWithSession,
  hashPassword,
  isValidEmail,
} from "../../../lib/site-admin";

function setupFailure(requestId: string, stage: string, error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error("admin_setup_failed", { requestId, stage, detail });
  return NextResponse.json(
    {
      error: `Үндсэн админ үүсгэх үед серверийн алдаа гарлаа. Лавлах дугаар: ${requestId}`,
      code: `ADMIN_SETUP_${stage.toUpperCase()}_FAILED`,
      requestId,
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  let needsSetup: boolean;
  try {
    needsSetup = (await countAdmins()) === 0;
  } catch (error) {
    return setupFailure(requestId, "database_check", error);
  }
  const identity = needsSetup ? authenticatedSiteIdentity(request) : null;
  return NextResponse.json({
    needsSetup,
    eligible: Boolean(identity),
    identity: identity ? { email: identity.email, name: identity.name } : null,
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let adminCount: number;
  try {
    adminCount = await countAdmins();
  } catch (error) {
    return setupFailure(requestId, "database_check", error);
  }
  if (adminCount !== 0) {
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
  let credential: Awaited<ReturnType<typeof hashPassword>>;
  try {
    credential = await hashPassword(password);
  } catch (error) {
    return setupFailure(requestId, "password", error);
  }
  let token: string;
  try {
    token = await createInitialAdminWithSession({
      userId,
      email,
      name,
      passwordHash: credential.hash,
      passwordSalt: credential.salt,
      now,
    });
  } catch (error) {
    return setupFailure(requestId, "persistence", error);
  }
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
