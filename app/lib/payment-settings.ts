export const paymentMethodIds = ["card", "qr", "bank_app", "transfer", "other"] as const;
export type PaymentMethodId = typeof paymentMethodIds[number];
export type BankApp = {
  id: string; nameMn: string; nameEn: string; imageUrl: string; bankUrl: string; enabled: boolean;
};
export type PaymentMethod = {
  id: PaymentMethodId; labelMn: string; labelEn: string; detailMn: string; detailEn: string;
  checkoutUrl: string; imageUrl: string; apps: BankApp[]; enabled: boolean;
};

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: "card", labelMn: "Банкны карт", labelEn: "Bank card", detailMn: "Дотоод болон олон улсын карт", detailEn: "Domestic or international card", checkoutUrl: "", imageUrl: "", apps: [], enabled: true },
  { id: "qr", labelMn: "Банкны QR", labelEn: "Bank QR", detailMn: "Дэмжигдсэн банкны апп-аар төлнө", detailEn: "Pay with a supported banking app", checkoutUrl: "", imageUrl: "", apps: [], enabled: true },
  { id: "bank_app", labelMn: "Банкны апп", labelEn: "Bank app", detailMn: "Банкны апп руу аюулгүй шилжинэ", detailEn: "Continue securely in the banking app", checkoutUrl: "", imageUrl: "", apps: [], enabled: true },
  { id: "transfer", labelMn: "Дансаар шилжүүлэх", labelEn: "Bank transfer", detailMn: "Нэхэмжлэл, гүйлгээний утгаар төлнө", detailEn: "Pay with invoice and payment reference", checkoutUrl: "", imageUrl: "", apps: [], enabled: true },
  { id: "other", labelMn: "Бусад", labelEn: "Other", detailMn: "Админаас идэвхжүүлсэн бусад хэлбэр", detailEn: "Another administrator-enabled method", checkoutUrl: "", imageUrl: "", apps: [], enabled: false },
];

function safeHttpsUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  try { const url = new URL(text); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

function safeMediaUrl(value: unknown) {
  const text = String(value || "").trim();
  return !text || /^\/api\/media\/[a-zA-Z0-9_-]+$/.test(text) ? text : null;
}

function normalizeApps(value: unknown) {
  const rows = Array.isArray(value) ? value.slice(0, 20) : [];
  const seen = new Set<string>();
  return rows.map((raw, index) => {
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    let id = String(row.id || `bank-app-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || `bank-app-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const imageUrl = safeMediaUrl(row.imageUrl), bankUrl = safeHttpsUrl(row.bankUrl);
    if (imageUrl === null) throw new Error("Банкны аппын зураг зөвхөн шууд байршуулсан зураг байна. / Upload the bank app image directly.");
    if (bankUrl === null) throw new Error("Банкны аппын холбоос HTTPS байна. / Bank app links must use HTTPS.");
    const app: BankApp = {
      id, nameMn: String(row.nameMn || "").trim().slice(0, 80), nameEn: String(row.nameEn || "").trim().slice(0, 80),
      imageUrl, bankUrl, enabled: row.enabled !== false,
    };
    if (app.enabled && (!app.nameMn || !app.nameEn || !app.imageUrl || !app.bankUrl))
      throw new Error("Харуулах банкны апп бүр MN/EN нэр, зураг, HTTPS холбоостой байна. / Each visible bank app needs MN/EN names, an image and an HTTPS link.");
    return app;
  });
}

export function normalizePaymentMethods(value: unknown): PaymentMethod[] {
  const rows = Array.isArray(value) ? value : [];
  return paymentMethodIds.map((id) => {
    const fallback = defaultPaymentMethods.find((row) => row.id === id)!;
    const row = (rows as Record<string, unknown>[]).find((item) => item?.id === id) || {};
    const checkoutUrl = safeHttpsUrl(row.checkoutUrl), imageUrl = safeMediaUrl(row.imageUrl);
    if (checkoutUrl === null) throw new Error(`${fallback.labelMn}: зөвхөн HTTPS банкны холбоос оруулна.`);
    if (imageUrl === null) throw new Error(`${fallback.labelMn}: зургийг төхөөрөмжөөс шууд байршуулна.`);
    return {
      id,
      labelMn: String(row.labelMn || fallback.labelMn).trim().slice(0, 80),
      labelEn: String(row.labelEn || fallback.labelEn).trim().slice(0, 80),
      detailMn: String(row.detailMn || fallback.detailMn).trim().slice(0, 180),
      detailEn: String(row.detailEn || fallback.detailEn).trim().slice(0, 180),
      checkoutUrl, imageUrl, apps: id === "bank_app" ? normalizeApps(row.apps) : [],
      enabled: row.enabled === undefined ? fallback.enabled : row.enabled === true,
    };
  });
}
