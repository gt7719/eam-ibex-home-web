import { tierNames } from "../../public/package-model.mjs";

export type OfferDurationUnit = "day" | "month" | "year";
export type LaunchOffer = {
  nameMn: string; nameEn: string; freeMonths: number; durationValue: number; durationUnit: OfferDurationUnit;
  textMn: string; textEn: string; startDate: string; endDate: string;
  scope: "all" | "selected"; planIds: string[]; enabled: boolean; showInPricing: boolean;
};
export const defaultLaunchOffer: LaunchOffer = {
  nameMn: "Нээлтийн урамшуулал", nameEn: "Launch offer", freeMonths: 3,
  durationValue: 3, durationUnit: "month", textMn: "", textEn: "", startDate: "", endDate: "",
  scope: "all", planIds: [], enabled: false, showInPricing: true,
};

export function offerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const utc = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 10) !== value) return NaN;
  return utc - 8 * 60 * 60 * 1000;
}

function utcDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function calculateOfferEndDate(startDate: string, durationValue: number, durationUnit: OfferDurationUnit) {
  const start = utcDate(startDate);
  if (!start || !Number.isInteger(durationValue) || durationValue < 1 || !["day", "month", "year"].includes(durationUnit)) return "";
  const end = new Date(start);
  if (durationUnit === "day") end.setUTCDate(end.getUTCDate() + durationValue - 1);
  else {
    const originalDay = end.getUTCDate();
    end.setUTCDate(1);
    if (durationUnit === "month") end.setUTCMonth(end.getUTCMonth() + durationValue);
    else end.setUTCFullYear(end.getUTCFullYear() + durationValue);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(originalDay, lastDay));
    end.setUTCDate(end.getUTCDate() - 1);
  }
  return end.toISOString().slice(0, 10);
}

function legacyDuration(startDate: string, endDate: string) {
  const start = utcDate(startDate), end = utcDate(endDate);
  if (!start || !end || end < start) return defaultLaunchOffer.durationValue;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function validateLaunchOffer(value: unknown): LaunchOffer {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Урамшууллын бүтэц буруу. / Invalid offer.");
  const v = value as Record<string, unknown>;
  if (!Number.isInteger(v.freeMonths) || Number(v.freeMonths) < 1 || Number(v.freeMonths) > 120) throw new Error("Үнэгүй сарын тоо 1–120 бүхэл тоо байна. / Enter 1–120 whole months.");
  const nameMn = String(v.nameMn ?? defaultLaunchOffer.nameMn).trim();
  const nameEn = String(v.nameEn ?? defaultLaunchOffer.nameEn).trim();
  if (!nameMn || !nameEn || nameMn.length > 100 || nameEn.length > 100) throw new Error("Урамшууллын MN/EN нэрийг 1–100 тэмдэгтээр оруулна уу. / Enter both offer names using 1–100 characters.");
  for (const key of ["textMn", "textEn", "startDate", "endDate"])
    if (typeof v[key] !== "string" || String(v[key]).length > 240) throw new Error("Текст болон огнооны формат буруу. / Invalid text or date format.");
  if (typeof v.enabled !== "boolean" || (v.showInPricing !== undefined && typeof v.showInPricing !== "boolean") || !["all", "selected"].includes(String(v.scope))) throw new Error("Төлөв эсвэл хамрах хүрээ буруу. / Invalid status or scope.");
  const startDate = String(v.startDate), suppliedEndDate = String(v.endDate);
  const isLegacy = v.durationValue === undefined && v.durationUnit === undefined;
  if (isLegacy && startDate && suppliedEndDate && startDate > suppliedEndDate) throw new Error("Дуусах огноо эхлэхээс өмнө байж болохгүй. / End date precedes start date.");
  const durationUnit = (isLegacy ? "day" : v.durationUnit) as OfferDurationUnit;
  const durationValue = Number(isLegacy ? legacyDuration(startDate, suppliedEndDate) : v.durationValue);
  if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 3650 || !["day", "month", "year"].includes(durationUnit)) throw new Error("Үргэлжлэх хугацааг өдөр, сар эсвэл жилээр зөв оруулна уу. / Enter a valid duration in days, months or years.");
  const validIds = tierNames.map((name: string) => name.toLowerCase());
  if (!Array.isArray(v.planIds) || v.planIds.some(id => typeof id !== "string" || !validIds.includes(id))) throw new Error("Хамаарах багцыг зөв сонгоно уу. / Choose valid plans.");
  for (const date of [startDate, suppliedEndDate]) if (date && !Number.isFinite(offerDate(date))) throw new Error("Огноо буруу байна. / Invalid calendar date.");
  const endDate = startDate ? calculateOfferEndDate(startDate, durationValue, durationUnit) : "";
  const offer: LaunchOffer = {
    nameMn, nameEn, freeMonths: Number(v.freeMonths), durationValue, durationUnit,
    textMn: String(v.textMn).trim(), textEn: String(v.textEn).trim(), startDate, endDate,
    scope: v.scope as LaunchOffer["scope"], planIds: [...new Set(v.planIds as string[])],
    enabled: v.enabled, showInPricing: v.showInPricing !== false,
  };
  if (offer.enabled && (!offer.startDate || !offer.endDate || (isLegacy && !suppliedEndDate))) throw new Error("Идэвхжүүлэхдээ эхлэх огноо болон үргэлжлэх хугацааг оруулна уу. / Set a start date and duration before enabling.");
  if (offer.scope === "selected" && !offer.planIds.length) throw new Error("Дор хаяж нэг багц сонгоно уу. / Select at least one plan.");
  return offer;
}

export function launchOfferText(offer: LaunchOffer, lang: "mn" | "en") {
  const text = lang === "en" ? offer.textEn : offer.textMn;
  const name = lang === "en" ? offer.nameEn : offer.nameMn;
  const fallback = lang === "en" ? "{name} — first {months} months free" : "{name} — эхний {months} сар үнэгүй";
  return (text || fallback).replaceAll("{name}", name).replaceAll("{months}", String(offer.freeMonths));
}

export function publicLaunchOffer(offer: LaunchOffer, now = Date.now()) {
  const startsAt = offerDate(offer.startDate), expiresAt = offerDate(offer.endDate) + 24 * 60 * 60 * 1000;
  if (!offer.enabled || !Number.isFinite(startsAt) || !Number.isFinite(expiresAt) || now >= expiresAt) return null;
  return { ...offer, textMn: launchOfferText(offer, "mn"), textEn: launchOfferText(offer, "en"), startsAt, expiresAt };
}
