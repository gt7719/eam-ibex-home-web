import { tierNames } from "../../public/package-model.mjs";

export type OfferDurationUnit = "day" | "month" | "year";
export type DiscountType = "percent" | "fixed" | "special";
export type PlanOffer = {
  planId: string;
  bonusEnabled: boolean; bonusValue: number; bonusUnit: OfferDurationUnit;
  discountEnabled: boolean; discountType: DiscountType; discountValue: number; specialPriceMnt: number | null;
  combineBenefits: boolean;
  nameMn: string; nameEn: string; textMn: string; textEn: string;
  startDate: string; endDate: string;
};
export type LaunchOffer = { schema: 2; plans: PlanOffer[] };

const planIds = tierNames.map((name: string) => name.toLowerCase());
export const defaultPlanOffer = (planId: string): PlanOffer => ({
  planId, bonusEnabled: false, bonusValue: 1, bonusUnit: "month",
  discountEnabled: false, discountType: "percent", discountValue: 0, specialPriceMnt: null,
  combineBenefits: false, nameMn: "Багцын урамшуулал", nameEn: "Plan offer",
  textMn: "", textEn: "", startDate: "", endDate: "",
});
export const defaultLaunchOffer: LaunchOffer = { schema: 2, plans: planIds.map(defaultPlanOffer) };

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
    const originalDay = end.getUTCDate(); end.setUTCDate(1);
    if (durationUnit === "month") end.setUTCMonth(end.getUTCMonth() + durationValue); else end.setUTCFullYear(end.getUTCFullYear() + durationValue);
    end.setUTCDate(Math.min(originalDay, new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()));
    end.setUTCDate(end.getUTCDate() - 1);
  }
  return end.toISOString().slice(0, 10);
}
function validText(value: unknown, max = 160) {
  const text = String(value ?? "").trim();
  if (text.length > max) throw new Error(`Текст ${max} тэмдэгтээс урт байна. / Text is too long.`);
  return text;
}
function validatePlanOffer(value: unknown, expectedId: string): PlanOffer {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Урамшууллын бүтэц буруу. / Invalid offer.");
  const v = value as Record<string, unknown>, planId = String(v.planId ?? expectedId);
  if (planId !== expectedId) throw new Error("Багцын дараалал буруу. / Invalid plan order.");
  const bonusUnit = String(v.bonusUnit ?? "month") as OfferDurationUnit, bonusValue = Number(v.bonusValue ?? 1);
  if (!Number.isInteger(bonusValue) || bonusValue < 1 || bonusValue > (bonusUnit === "day" ? 3650 : bonusUnit === "month" ? 120 : 10) || !["day", "month", "year"].includes(bonusUnit)) throw new Error(`${planId}: Урамшууллын хугацаа буруу. / Invalid bonus duration.`);
  const discountType = String(v.discountType ?? "percent") as DiscountType;
  if (!["percent", "fixed", "special"].includes(discountType)) throw new Error(`${planId}: Хөнгөлөлтийн төрөл буруу. / Invalid discount type.`);
  const discountValue = Number(v.discountValue ?? 0), specialPriceMnt = v.specialPriceMnt === null || v.specialPriceMnt === "" || v.specialPriceMnt === undefined ? null : Number(v.specialPriceMnt);
  if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > (discountType === "percent" ? 100 : 1_000_000_000)) throw new Error(`${planId}: Хөнгөлөлтийн утга буруу. / Invalid discount value.`);
  if (specialPriceMnt !== null && (!Number.isInteger(specialPriceMnt) || specialPriceMnt < 0 || specialPriceMnt > 1_000_000_000)) throw new Error(`${planId}: Тусгай үнэ буруу. / Invalid special price.`);
  const startDate = String(v.startDate ?? ""), endDate = String(v.endDate ?? "");
  for (const date of [startDate, endDate]) if (date && !Number.isFinite(offerDate(date))) throw new Error(`${planId}: Огноо буруу. / Invalid date.`);
  if (startDate && endDate && startDate > endDate) throw new Error(`${planId}: Дуусах огноо эхлэхээс өмнө байна. / End date precedes start date.`);
  const bonusEnabled = v.bonusEnabled === true, discountEnabled = v.discountEnabled === true && planId !== "free";
  if ((bonusEnabled || discountEnabled) && (!startDate || !endDate)) throw new Error(`${planId}: Идэвхтэй урамшуулалд эхлэх, дуусах огноо шаардлагатай. / Active benefits require start and end dates.`);
  if (discountEnabled && discountType !== "special" && discountValue <= 0) throw new Error(`${planId}: Идэвхтэй хөнгөлөлтийн утга 0-ээс их байна. / Active discount must be greater than zero.`);
  if (discountEnabled && discountType === "special" && specialPriceMnt === null) throw new Error(`${planId}: Тусгай үнийг оруулна уу. / Special price is required.`);
  if (bonusEnabled && discountEnabled && v.combineBenefits !== true) throw new Error(`${planId}: Хугацааны болон үнийн урамшууллыг хамт хэрэглэхийг зөвшөөрнө үү, эсвэл нэгийг нь унтраана уу. / Explicitly allow stacking or disable one benefit.`);
  return { planId, bonusEnabled, bonusValue, bonusUnit, discountEnabled, discountType, discountValue, specialPriceMnt,
    combineBenefits: v.combineBenefits === true, nameMn: validText(v.nameMn || "Багцын урамшуулал", 100), nameEn: validText(v.nameEn || "Plan offer", 100),
    textMn: validText(v.textMn, 240), textEn: validText(v.textEn, 240), startDate, endDate };
}
function migrateLegacy(v: Record<string, unknown>): LaunchOffer {
  const scope = String(v.scope ?? "all"), selected = Array.isArray(v.planIds) ? v.planIds.map(String) : [];
  return { schema: 2, plans: planIds.map(id => {
    const row = defaultPlanOffer(id), applies = scope === "all" || selected.includes(id);
    if (!applies) return row;
    return { ...row, bonusEnabled: v.enabled === true, bonusValue: Number(v.durationValue ?? v.freeMonths ?? 1), bonusUnit: String(v.durationUnit ?? "month") as OfferDurationUnit,
      nameMn: String(v.nameMn ?? row.nameMn), nameEn: String(v.nameEn ?? row.nameEn), textMn: String(v.textMn ?? ""), textEn: String(v.textEn ?? ""), startDate: String(v.startDate ?? ""), endDate: String(v.endDate ?? "") };
  }) };
}
export function validateLaunchOffer(value: unknown): LaunchOffer {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Урамшууллын бүтэц буруу. / Invalid offer.");
  let v = value as Record<string, unknown>;
  if (!Array.isArray(v.plans)) {
    if (!("enabled" in v) || !("scope" in v)) throw new Error("Урамшууллын бүтэц буруу. / Invalid offer.");
    v = migrateLegacy(v) as unknown as Record<string, unknown>;
  }
  if (!Array.isArray(v.plans) || v.plans.length !== planIds.length) throw new Error("Багц бүрийн урамшууллыг бүрэн оруулна уу. / Configure every plan.");
  return { schema: 2, plans: planIds.map((id, index) => validatePlanOffer((v.plans as unknown[])[index], id)) };
}
export function offerDurationText(offer: Pick<PlanOffer, "bonusValue" | "bonusUnit">, lang: "mn" | "en") {
  if (lang === "mn") return `${offer.bonusValue} ${offer.bonusUnit === "day" ? "өдөр" : offer.bonusUnit === "month" ? "сар" : "жил"}`;
  return `${offer.bonusValue} ${offer.bonusUnit}${offer.bonusValue === 1 ? "" : "s"}`;
}
export function launchOfferText(offer: PlanOffer, lang: "mn" | "en") {
  const custom = lang === "en" ? offer.textEn : offer.textMn;
  if (custom) return custom;
  const benefits: string[] = [];
  if (offer.bonusEnabled) benefits.push(lang === "en" ? `${offerDurationText(offer, lang)} free` : `${offerDurationText(offer, lang)} үнэгүй`);
  if (offer.discountEnabled) benefits.push(offer.discountType === "percent" ? `${offer.discountValue}% ${lang === "en" ? "off" : "хөнгөлөлт"}` : offer.discountType === "fixed" ? `${offer.discountValue.toLocaleString()} ₮ ${lang === "en" ? "off" : "хөнгөлөлт"}` : (lang === "en" ? "Special price" : "Тусгай үнэ"));
  return benefits.join(offer.combineBenefits ? " + " : " · ");
}
export function publicLaunchOffer(offer: LaunchOffer, now = Date.now()) {
  return { schema: 2, plans: offer.plans.flatMap(plan => {
    const startsAt = offerDate(plan.startDate), expiresAt = offerDate(plan.endDate) + 86_400_000;
    if ((!plan.bonusEnabled && !plan.discountEnabled) || !Number.isFinite(startsAt) || !Number.isFinite(expiresAt)) return [];
    const pricingActive = now >= startsAt && now < expiresAt;
    const displayState = pricingActive ? "active" : now < startsAt ? "scheduled" : "ended";
    return [{ ...plan, badgeMn: launchOfferText(plan, "mn"), badgeEn: launchOfferText(plan, "en"), startsAt, expiresAt, pricingActive, displayState }];
  }) };
}
