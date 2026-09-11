import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { defaultPaymentMethods, normalizePaymentMethods } from "../../../lib/payment-settings";

const PAYMENT_SETTINGS_KEY = "paymentSettings";

async function authorized() {
  const user = await getAdminSession();
  if (!user) return { user: null, error: NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 }) };
  if (!hasAdminPermission(user, "pricing.manage")) return { user, error: NextResponse.json({ error: "Үнэ ба төлбөр удирдах эрхгүй." }, { status: 403 }) };
  return { user, error: null };
}

async function readMethods() {
  const row = await env.DB.prepare("SELECT value_json FROM site_content WHERE key = ?").bind(PAYMENT_SETTINGS_KEY).first<{ value_json: string }>();
  try { return normalizePaymentMethods(row ? JSON.parse(row.value_json) : defaultPaymentMethods); } catch { return normalizePaymentMethods(defaultPaymentMethods); }
}

export async function GET() {
  const { error } = await authorized(); if (error) return error;
  return NextResponse.json({ methods: await readMethods() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const { user, error } = await authorized(); if (error || !user) return error!;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  try {
    const body = await request.json();
    const methods = normalizePaymentMethods(body.methods);
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at")
      .bind(PAYMENT_SETTINGS_KEY, JSON.stringify(methods), user.id, now).run();
    return NextResponse.json({ methods, saved: true });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Төлбөрийн тохиргоог хадгалж чадсангүй." }, { status: 400 });
  }
}
