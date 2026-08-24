import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DIRECTUS_URL,
  canManageWebsiteAdmins,
  getDirectusUser,
} from "../../../lib/directus";

type DirectusRole = { id: string; name: string };
type ManagedUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  status?: string | null;
  last_access?: string | null;
  role?: DirectusRole | string | null;
};

async function administratorContext() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("ibex_directus_access")?.value;
  if (!accessToken) return null;
  const user = await getDirectusUser(accessToken);
  return canManageWebsiteAdmins(user) ? { accessToken, user } : null;
}

async function contentEditorRole(accessToken: string) {
  const url = new URL(`${DIRECTUS_URL}/roles`);
  url.searchParams.set("filter[name][_eq]", "Website Content Editor");
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: DirectusRole[] };
  return payload.data?.[0] || null;
}

function roleName(user: ManagedUser) {
  return typeof user.role === "object" ? user.role?.name || "" : "";
}

function safeUser(user: ManagedUser) {
  return {
    id: user.id,
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
    status: user.status || "invited",
    lastAccess: user.last_access || null,
    role: roleName(user),
  };
}

export async function GET() {
  const context = await administratorContext();
  if (!context) {
    return NextResponse.json({ error: "Админ хэрэглэгч удирдах эрхгүй байна." }, { status: 403 });
  }

  const url = new URL(`${DIRECTUS_URL}/users`);
  url.searchParams.set(
    "fields",
    "id,email,first_name,last_name,status,last_access,role.id,role.name",
  );
  url.searchParams.set("limit", "-1");
  url.searchParams.set("sort", "email");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${context.accessToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return NextResponse.json(
      { error: "Directus хэрэглэгчдийн жагсаалтыг уншиж чадсангүй." },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as { data?: ManagedUser[] };
  const users = (payload.data || [])
    .filter((user) => ["administrator", "website content editor"].includes(roleName(user).toLowerCase()))
    .map(safeUser);
  const inviteRole = await contentEditorRole(context.accessToken);

  return NextResponse.json({ users, inviteEnabled: Boolean(inviteRole) });
}

export async function POST(request: Request) {
  const context = await administratorContext();
  if (!context) {
    return NextResponse.json({ error: "Админ нэмэх эрхгүй байна." }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Зөв и-мэйл хаяг оруулна уу." }, { status: 400 });
  }

  const role = await contentEditorRole(context.accessToken);
  if (!role) {
    return NextResponse.json(
      { error: "Directus дээр Website Content Editor эрх эхлээд үүсгэх шаардлагатай." },
      { status: 409 },
    );
  }

  const response = await fetch(`${DIRECTUS_URL}/users/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, role: role.id }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return NextResponse.json(
      { error: "Урилга илгээж чадсангүй. И-мэйл давхардсан эсвэл Directus-ийн mail тохиргоог шалгана уу." },
      { status: response?.status || 502 },
    );
  }
  return NextResponse.json({ invited: true });
}

export async function PATCH(request: Request) {
  const context = await administratorContext();
  if (!context) {
    return NextResponse.json({ error: "Админы төлөв өөрчлөх эрхгүй байна." }, { status: 403 });
  }

  let body: { id?: string; status?: "active" | "suspended" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 });
  }
  if (!body.id || !["active", "suspended"].includes(body.status || "")) {
    return NextResponse.json({ error: "Хэрэглэгч эсвэл төлөв буруу байна." }, { status: 400 });
  }

  const targetResponse = await fetch(
    `${DIRECTUS_URL}/users/${encodeURIComponent(body.id)}?fields=id,email,status,role.id,role.name`,
    { headers: { Authorization: `Bearer ${context.accessToken}` }, cache: "no-store" },
  ).catch(() => null);
  if (!targetResponse?.ok) {
    return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  }
  const targetPayload = (await targetResponse.json()) as { data?: ManagedUser };
  const target = targetPayload.data;
  if (!target || roleName(target).toLowerCase() !== "website content editor") {
    return NextResponse.json(
      { error: "Зөвхөн Website Content Editor эрхтэй хэрэглэгчийн төлөвийг өөрчилж болно." },
      { status: 403 },
    );
  }

  const response = await fetch(`${DIRECTUS_URL}/users/${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: body.status }),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) {
    return NextResponse.json({ error: "Хэрэглэгчийн төлөвийг өөрчилж чадсангүй." }, { status: 502 });
  }
  return NextResponse.json({ updated: true });
}
