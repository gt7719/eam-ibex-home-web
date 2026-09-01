import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";

const PAYMENT_SETTINGS_KEY = "paymentSettings";
const ids = ["card", "qr", "bank_app", "transfer", "other"] as const;
type PaymentMethodInput = { id?: unknown; labelMn?: unknown; labelEn?: unknown; detailMn?: unknown; detailEn?: unknown; checkoutUrl?: unknown; enabled?: unknown };

const defaultPaymentMethods = [
  { id: "card", labelMn: "Банкны карт", labelEn: "Bank card", detailMn: "Дотоод болон олон улсын карт", detailEn: "Domestic or international card", checkoutUrl: "", enabled: true },
  { id: "qr", labelMn: "Банкны QR", labelEn: "Bank QR", detailMn: "Дэмжигдсэн банкны апп-аар төлнө", detailEn: "Pay with a supported banking app", checkoutUrl: "", enabled: true },
  { id: "bank_app", labelMn: "Банкны апп", labelEn: "Bank app", detailMn: "Банкны апп руу аюулгүй шилжинэ", detailEn: "Continue securely in the banking app", checkoutUrl: "", enabled: true },
  { id: "transfer", labelMn: "Дансаар шилжүүлэх", labelEn: "Bank transfer", detailMn: "Нэхэмжлэл, гүйлгээний утгаар төлнө", detailEn: "Pay with invoice and payment reference", checkoutUrl: "", enabled: true },
  { id: "other", labelMn: "Бусад", labelEn: "Other", detailMn: "Админаас идэвхжүүлсэн бусад хэлбэр", detailEn: "Another administrator-enabled method", checkoutUrl: "", enabled: false },
];

function safeUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  try { const url = new URL(text); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

function normalizePaymentMethods(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  return ids.map((id) => {
    const fallback = defaultPaymentMethods.find((row) => row.id === id)!;
    const row = (rows as PaymentMethodInput[]).find((item) => item?.id === id) || {};
    const checkoutUrl = safeUrl(row.checkoutUrl);
    if (checkoutUrl === null) throw new Error(`${fallback.labelMn}: зөвхөн HTTPS банкны холбоос оруулна.`);
    return {
      id,
      labelMn: String(row.labelMn || fallback.labelMn).slice(0, 80),
      labelEn: String(row.labelEn || fallback.labelEn).slice(0, 80),
      detailMn: String(row.detailMn || fallback.detailMn).slice(0, 180),
      detailEn: String(row.detailEn || fallback.detailEn).slice(0, 180),
      checkoutUrl,
      enabled: row.enabled === undefined ? fallback.enabled : row.enabled === true,
    };
  });
}

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
