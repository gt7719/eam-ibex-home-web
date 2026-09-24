import { NextResponse } from "next/server";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { readLaunchOffer, saveLaunchOffer } from "../../../lib/launch-offer";
import { validateLaunchOffer } from "../../../lib/launch-offer-model";
import { readBoundedText } from "../../../lib/http-input";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function authorized() {
  const user = await getAdminSession();
  return { user, error: !user ? reply({ error: "Админ нэвтрэлт шаардлагатай. / Sign in as an administrator." }, 401) : !hasAdminPermission(user, "pricing.manage") ? reply({ error: "Үнэ удирдах эрхгүй. / Pricing permission required." }, 403) : null };
}
export async function GET() {
  const { error } = await authorized(); if (error) return error;
  try { const { offer, revision } = await readLaunchOffer(); return reply({ offer, revision }); }
  catch { return reply({ error: "Урамшууллыг уншиж чадсангүй. Дахин оролдоно уу. / Could not load the offer. Please retry." }, 503); }
}
export async function PUT(request: Request) {
  const { user, error } = await authorized(); if (error || !user) return error!;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Origin mismatch" }, 403);
  let body, offer;
  try {
    const text = await readBoundedText(request, 10_000);
    if (!text.ok) return reply({ error: text.error }, text.status);
    body = JSON.parse(text.value || "{}");
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new Error("Хувилбарын дугаар буруу. / Invalid revision.");
    offer = validateLaunchOffer(body.offer);
  } catch (reason) { return reply({ error: reason instanceof Error ? reason.message : "Тохиргоо буруу. / Invalid offer." }, 400); }
  try {
    const next = await saveLaunchOffer(offer, body.revision, user.id);
    return next ? reply({ ...next, saved: true }) : reply({ error: "Өөр админ шинэчилсэн байна. Дахин ачаалж хянана уу. / Another administrator updated this offer. Reload and review." }, 409);
  } catch { return reply({ error: "Хадгалж чадсангүй. Оруулсан мэдээллээ хадгалан дахин оролдоно уу. / Could not save. Your input is retained; please retry." }, 503); }
}
