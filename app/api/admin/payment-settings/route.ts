import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { defaultPaymentMethods, normalizePaymentMethods } from "../../../lib/payment-settings";
import { conflictMessage, hasTrustedOrigin, saveContentWithRevision } from "../../../lib/admin-security";

const PAYMENT_SETTINGS_KEY = "paymentSettings";

async function authorized() {
  const user = await getAdminSession();
  if (!user) return { user: null, error: NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 }) };
  if (!hasAdminPermission(user, "pricing.manage")) return { user, error: NextResponse.json({ error: "Үнэ ба төлбөр удирдах эрхгүй." }, { status: 403 }) };
  return { user, error: null };
}

async function readMethods() {
  const row = await env.DB.prepare("SELECT value_json,updated_at FROM site_content WHERE key = ?").bind(PAYMENT_SETTINGS_KEY).first<{ value_json: string; updated_at: string }>();
  try { return { methods: normalizePaymentMethods(row ? JSON.parse(row.value_json) : defaultPaymentMethods), revision: row?.updated_at || null }; } catch { return { methods: normalizePaymentMethods(defaultPaymentMethods), revision: row?.updated_at || null }; }
}

export async function GET() {
  const { error } = await authorized(); if (error) return error;
  return NextResponse.json(await readMethods(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const { user, error } = await authorized(); if (error || !user) return error!;
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  try {
    const body = await request.json();
    const methods = normalizePaymentMethods(body.methods);
    const revision = await saveContentWithRevision({ key: PAYMENT_SETTINGS_KEY, value: methods, userId: user.id, expectedRevision: body.revision ?? null });
    if (!revision) return NextResponse.json({ error: conflictMessage() }, { status: 409 });
    return NextResponse.json({ methods, saved: true, revision });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Төлбөрийн тохиргоог хадгалж чадсангүй." }, { status: 400 });
  }
}
