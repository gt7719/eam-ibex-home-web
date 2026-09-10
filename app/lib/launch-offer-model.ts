import { tierNames } from "../../public/package-model.mjs";

export type LaunchOffer = {
  freeMonths: number;
  textMn: string;
  textEn: string;
  startDate: string;
  endDate: string;
  scope: "all" | "selected";
  planIds: string[];
  enabled: boolean;
  showInPricing: boolean;
};
export const defaultLaunchOffer: LaunchOffer = {
  freeMonths: 3, textMn: "", textEn: "", startDate: "", endDate: "",
  scope: "all", planIds: [], enabled: false, showInPricing: true,
};
export function offerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const utc = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== value) return NaN;
  return utc - 8 * 60 * 60 * 1000; // Ulaanbaatar calendar day.
}
export function validateLaunchOffer(value: unknown): LaunchOffer {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Урамшууллын бүтэц буруу. / Invalid offer.");
  const v = value as Record<string, unknown>;
  if (!Number.isInteger(v.freeMonths) || Number(v.freeMonths) < 1 || Number(v.freeMonths) > 120) throw new Error("Үнэгүй сарын тоо 1–120 бүхэл тоо байна. / Enter 1–120 whole months.");
  for (const key of ["textMn", "textEn", "startDate", "endDate"])
    if (typeof v[key] !== "string" || String(v[key]).length > 240) throw new Error("Текст болон огнооны формат буруу. / Invalid text or date format.");
  if (typeof v.enabled !== "boolean" || typeof v.showInPricing !== "boolean" || !["all", "selected"].includes(String(v.scope))) throw new Error("Төлөв эсвэл хамрах хүрээ буруу. / Invalid status or scope.");
  const validIds = tierNames.map((name: string) => name.toLowerCase());
  if (!Array.isArray(v.planIds) || v.planIds.some(id => typeof id !== "string" || !validIds.includes(id))) throw new Error("Хамаарах багцыг зөв сонгоно уу. / Choose valid plans.");
  const offer: LaunchOffer = {
    freeMonths: Number(v.freeMonths), textMn: String(v.textMn).trim(), textEn: String(v.textEn).trim(),
    startDate: String(v.startDate), endDate: String(v.endDate), scope: v.scope as LaunchOffer["scope"],
    planIds: [...new Set(v.planIds as string[])], enabled: v.enabled, showInPricing: v.showInPricing,
  };
  for (const date of [offer.startDate, offer.endDate])
    if (date && !Number.isFinite(offerDate(date))) throw new Error("Огноо буруу байна. / Invalid calendar date.");
  if (offer.startDate && offer.endDate && offer.startDate > offer.endDate) throw new Error("Дуусах огноо эхлэхээс өмнө байж болохгүй. / End date precedes start date.");
  if (offer.enabled && (!offer.startDate || !offer.endDate)) throw new Error("Идэвхжүүлэхдээ эхлэх, дуусах огноог оруулна уу. / Set both dates before enabling.");
  if (offer.scope === "selected" && !offer.planIds.length) throw new Error("Дор хаяж нэг багц сонгоно уу. / Select at least one plan.");
  return offer;
}
export function launchOfferText(offer: LaunchOffer, lang: "mn" | "en") {
  const text = lang === "en" ? offer.textEn : offer.textMn;
  return (text || (lang === "en" ? "Launch offer — first {months} months free" : "Нээлтийн урамшуулал — эхний {months} сар үнэгүй")).replaceAll("{months}", String(offer.freeMonths));
}
export function publicLaunchOffer(offer: LaunchOffer, now = Date.now()) {
  const startsAt = offerDate(offer.startDate), expiresAt = offerDate(offer.endDate) + 24 * 60 * 60 * 1000;
  if (!offer.enabled || !Number.isFinite(startsAt) || !Number.isFinite(expiresAt) || now >= expiresAt) return null;
  return { ...offer, textMn: launchOfferText(offer, "mn"), textEn: launchOfferText(offer, "en"), startsAt, expiresAt };
}
