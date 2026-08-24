import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  ADMIN_CONTENT_PERMISSIONS,
  getAdminSession,
  hashPassword,
  isAdminPermission,
  isValidEmail,
  normalizeAdminPermissions,
  type AdminPermission,
} from "../../../lib/site-admin";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions_json: string | null;
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
    "SELECT id, email, name, role, permissions_json, status, last_access FROM admin_users ORDER BY role DESC, email ASC",
  ).all<UserRow>();
  const users = (rows.results || []).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.role === "owner"
      ? ["pricing.manage", "partners.manage", "people.manage", "media.upload"]
      : normalizeStoredPermissions(user.permissions_json),
    status: user.status,
    lastAccess: user.last_access,
  }));
  return NextResponse.json({ users, inviteEnabled: true });
}

function normalizeStoredPermissions(value: string | null) {
  if (value == null) return ["pricing.manage", "partners.manage", "people.manage", "media.upload"] as AdminPermission[];
  try {
    return normalizeAdminPermissions(JSON.parse(value));
  } catch {
    return [];
  }
}

function requestedPermissions(value: unknown) {
  if (!Array.isArray(value) || value.some((permission) => !isAdminPermission(permission))) return null;
  const permissions = normalizeAdminPermissions(value);
  const hasContentPermission = permissions.some((permission) =>
    (ADMIN_CONTENT_PERMISSIONS as readonly string[]).includes(permission),
  );
  return hasContentPermission ? permissions : null;
}

export async function POST(request: Request) {
  const owner = await ownerSession();
  if (!owner) return NextResponse.json({ error: "Админ нэмэх эрхгүй байна." }, { status: 403 });
  let body: { email?: string; name?: string; password?: string; permissions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() || "";
  const name = body.name?.trim() || "";
  const password = body.password || "";
  const permissions = requestedPermissions(body.permissions);
  if (!isValidEmail(email) || name.length < 2 || password.length < 10) {
    return NextResponse.json(
      { error: "Нэр, зөв и-мэйл болон 10-аас дээш тэмдэгттэй түр нууц үг оруулна уу." },
      { status: 400 },
    );
  }
  if (!permissions) {
    return NextResponse.json(
      { error: "Админд контент өөрчлөх хамгийн багадаа нэг эрх сонгоно уу." },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const credential = await hashPassword(password);
  try {
    await env.DB.prepare(
      `INSERT INTO admin_users
       (id, email, name, password_hash, password_salt, role, permissions_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'editor', ?, 'active', ?, ?)`,
    )
      .bind(crypto.randomUUID(), email, name, credential.hash, credential.salt, JSON.stringify(permissions), now, now)
      .run();
  } catch {
    return NextResponse.json({ error: "Энэ и-мэйлтэй админ бүртгэлтэй байна." }, { status: 409 });
  }
  return NextResponse.json({ created: true });
}

export async function PATCH(request: Request) {
  const owner = await ownerSession();
  if (!owner) return NextResponse.json({ error: "Админы төлөв өөрчлөх эрхгүй байна." }, { status: 403 });
  let body: { id?: string; status?: "active" | "suspended"; permissions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const hasStatusUpdate = body.status !== undefined;
  const hasPermissionUpdate = body.permissions !== undefined;
  if (!body.id || (!hasStatusUpdate && !hasPermissionUpdate)) {
    return NextResponse.json({ error: "Хэрэглэгч эсвэл өөрчлөх утга буруу байна." }, { status: 400 });
  }
  if (hasStatusUpdate && !["active", "suspended"].includes(body.status || "")) {
    return NextResponse.json({ error: "Хэрэглэгчийн төлөв буруу байна." }, { status: 400 });
  }
  const permissions = hasPermissionUpdate ? requestedPermissions(body.permissions) : null;
  if (hasPermissionUpdate && !permissions) {
    return NextResponse.json(
      { error: "Админд контент өөрчлөх хамгийн багадаа нэг эрх сонгоно уу." },
      { status: 400 },
    );
  }
  const target = await env.DB.prepare("SELECT role FROM admin_users WHERE id = ? LIMIT 1")
    .bind(body.id)
    .first<{ role: string }>();
  if (!target) return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  if (target.role === "owner") {
    return NextResponse.json({ error: "Үндсэн админы эрхийг эндээс хаах боломжгүй." }, { status: 403 });
  }
  const now = new Date().toISOString();
  if (hasStatusUpdate && permissions) {
    await env.DB.prepare(
      "UPDATE admin_users SET status = ?, permissions_json = ?, updated_at = ? WHERE id = ?",
    )
      .bind(body.status, JSON.stringify(permissions), now, body.id)
      .run();
  } else if (hasStatusUpdate) {
    await env.DB.prepare("UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?")
      .bind(body.status, now, body.id)
      .run();
  } else if (permissions) {
    await env.DB.prepare("UPDATE admin_users SET permissions_json = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(permissions), now, body.id)
      .run();
  }
  if (body.status === "suspended") {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE user_id = ?").bind(body.id).run();
  }
  return NextResponse.json({ updated: true });
}
