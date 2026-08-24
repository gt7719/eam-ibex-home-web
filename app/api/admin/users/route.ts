import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hashPassword, isValidEmail } from "../../../lib/site-admin";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_access: string | null;
};

async function ownerSession() {
  const user = await getAdminSession();
  return user?.canManageAdmins ? user : null;
}

export async function GET() {
  const owner = await ownerSession();
  if (!owner) return NextResponse.json({ error: "Админ хэрэглэгч удирдах эрхгүй байна." }, { status: 403 });
  const rows = await env.DB.prepare(
    "SELECT id, email, name, role, status, last_access FROM admin_users ORDER BY role DESC, email ASC",
  ).all<UserRow>();
  const users = (rows.results || []).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    lastAccess: user.last_access,
  }));
  return NextResponse.json({ users, inviteEnabled: true });
}

export async function POST(request: Request) {
  const owner = await ownerSession();
  if (!owner) return NextResponse.json({ error: "Админ нэмэх эрхгүй байна." }, { status: 403 });
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() || "";
  const name = body.name?.trim() || "";
  const password = body.password || "";
  if (!isValidEmail(email) || name.length < 2 || password.length < 10) {
    return NextResponse.json(
      { error: "Нэр, зөв и-мэйл болон 10-аас дээш тэмдэгттэй түр нууц үг оруулна уу." },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const credential = await hashPassword(password);
  try {
    await env.DB.prepare(
      `INSERT INTO admin_users
       (id, email, name, password_hash, password_salt, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'editor', 'active', ?, ?)`,
    )
      .bind(crypto.randomUUID(), email, name, credential.hash, credential.salt, now, now)
      .run();
  } catch {
    return NextResponse.json({ error: "Энэ и-мэйлтэй админ бүртгэлтэй байна." }, { status: 409 });
  }
  return NextResponse.json({ created: true });
}

export async function PATCH(request: Request) {
  const owner = await ownerSession();
  if (!owner) return NextResponse.json({ error: "Админы төлөв өөрчлөх эрхгүй байна." }, { status: 403 });
  let body: { id?: string; status?: "active" | "suspended" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  if (!body.id || !["active", "suspended"].includes(body.status || "")) {
    return NextResponse.json({ error: "Хэрэглэгч эсвэл төлөв буруу байна." }, { status: 400 });
  }
  const target = await env.DB.prepare("SELECT role FROM admin_users WHERE id = ? LIMIT 1")
    .bind(body.id)
    .first<{ role: string }>();
  if (!target) return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Үндсэн админы эрхийг эндээс хаах боломжгүй." }, { status: 403 });
  }
  await env.DB.prepare("UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?")
    .bind(body.status, new Date().toISOString(), body.id)
    .run();
  if (body.status === "suspended") {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE user_id = ?").bind(body.id).run();
  }
  return NextResponse.json({ updated: true });
}
