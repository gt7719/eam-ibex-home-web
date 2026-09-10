"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import LaunchOfferEditor from "./launch-offer-editor";

type PaymentMethod = {
  id: "card" | "qr" | "bank_app" | "transfer" | "other";
  labelMn: string;
  labelEn: string;
  detailMn: string;
  detailEn: string;
  checkoutUrl: string;
  enabled: boolean;
};

const methodNames: Record<PaymentMethod["id"], string> = {
  card: "Банкны карт",
  qr: "Банкны QR",
  bank_app: "Банкны апп",
  transfer: "Дансаар шилжүүлэх",
  other: "Бусад",
};

export default function PricingAdminPage() {
  const { t } = useSiteLanguage();
  const [embedded, setEmbedded] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const embeddedTimer = window.setTimeout(() => setEmbedded(new URLSearchParams(window.location.search).get("embedded") === "1"), 0);
    fetch("/api/admin/payment-settings", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) { window.location.replace("/admin/login"); return; }
        if (response.status === 403) { window.location.replace("/admin"); return; }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Төлбөрийн тохиргоог уншиж чадсангүй.");
        setMethods(payload.methods || []);
        setLoading(false);
      })
      .catch((reason) => { setError(reason instanceof Error ? reason.message : "Төлбөрийн тохиргоог уншиж чадсангүй."); setLoading(false); });
    return () => window.clearTimeout(embeddedTimer);
  }, []);

  function update(id: PaymentMethod["id"], key: keyof PaymentMethod, value: string | boolean) {
    setMethods((current) => current.map((method) => method.id === id ? { ...method, [key]: value } : method));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    const response = await fetch("/api/admin/payment-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methods }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(payload.error || t("Төлбөрийн тохиргоог хадгалж чадсангүй.", "Could not save payment settings."));
    else { setMethods(payload.methods || methods); setMessage(t("Төлбөрийн хэлбэрийн тохиргоог хадгаллаа.", "Payment method settings were saved.")); }
    setSaving(false);
  }

  return (
    <main className={`pricing-admin-page${embedded ? " embedded-admin-page" : ""}`}>
      <header className="pricing-admin-header">
        <a href="/admin" className="admin-users-back">← {t("Сайтын админ", "Site administration")}</a>
        <div><span className="admin-auth-kicker">PRICING &amp; CHECKOUT</span><h1>{t("Үнэ ба төлбөр", "Pricing and payments")}</h1><p>{t("Багцын MNT үнэ, жилийн хөнгөлөлт болон төлбөрийн аргыг зөвхөн эрхтэй админ удирдана.", "Only an authorized administrator can manage MNT prices, annual discounts and payment methods.")}</p></div>
      </header>
      {error ? <div className="knowledge-alert error" role="alert">{error}</div> : null}
      {message ? <div className="knowledge-alert success" role="status">{message}</div> : null}
      <section className="pricing-admin-section">
        <div className="pricing-admin-section-head"><span className="admin-step">01</span><h2>{t("Багцын шаталсан тохиргоо", "Tiered package configuration")}</h2><p>{t("Free → Go → Plus → Pro → Custom дарааллаар сарын MNT үнэ, жилийн хямдрал, хэрэглэгч, хөрөнгө болон цэсийг тогтооно.", "Configure monthly MNT prices, annual discounts, users, assets and menus in Free → Go → Plus → Pro → Custom order.")}</p></div>
        <iframe className="package-admin-frame" src="/package-admin.html" title={t("Багцын шаталсан тохиргоо", "Tiered package configuration")} />
      </section>
      <LaunchOfferEditor />
      <form className="pricing-admin-section payment-admin-section" onSubmit={save}>
        <div className="pricing-admin-section-head"><span className="admin-step">03</span><h2>{t("Төлбөрийн хэлбэр", "Payment methods")}</h2><p>{t("Нийтийн BUY цонхонд харуулах хэлбэрийг идэвхжүүлнэ. Банкнаас өгсөн HTTPS checkout холбоосыг л оруулна.", "Enable methods shown in the public BUY flow and enter only bank-provided HTTPS checkout links.")}</p></div>
        {loading ? <p className="admin-users-empty">{t("Тохиргоог уншиж байна…", "Loading settings…")}</p> : <div className="payment-admin-grid">{methods.map((method) => (
          <article className="payment-admin-card" key={method.id}>
            <div className="payment-admin-title"><strong>{t(methodNames[method.id], method.labelEn || methodNames[method.id])}</strong><label><input type="checkbox" checked={method.enabled} onChange={(event) => update(method.id, "enabled", event.target.checked)} /> {t("Харуулах", "Show")}</label></div>
            <label>{t("Нэр", "Name")} · MN<input value={method.labelMn} onChange={(event) => update(method.id, "labelMn", event.target.value)} /></label>
            <label>Name · EN<input value={method.labelEn} onChange={(event) => update(method.id, "labelEn", event.target.value)} /></label>
            <label>{t("Тайлбар", "Description")} · MN<input value={method.detailMn} onChange={(event) => update(method.id, "detailMn", event.target.value)} /></label>
            <label>Description · EN<input value={method.detailEn} onChange={(event) => update(method.id, "detailEn", event.target.value)} /></label>
            <label className="wide">{t("Банкны checkout холбоос", "Bank checkout URL")}<input type="url" value={method.checkoutUrl} onChange={(event) => update(method.id, "checkoutUrl", event.target.value)} placeholder="https://bank-or-gateway.example/checkout" /></label>
          </article>
        ))}</div>}
        <div className="payment-admin-actions"><small>{t("Merchant secret, API key болон callback нууц мэдээллийг энд оруулахгүй. Тэдгээр нь зөвхөн серверийн хамгаалагдсан орчинд байна.", "Do not enter merchant secrets, API keys or callback secrets here. They remain in the protected server environment.")}</small><button type="submit" disabled={saving || loading}>{saving ? t("Хадгалж байна…", "Saving…") : t("Төлбөрийн тохиргоо хадгалах", "Save payment settings")}</button></div>
      </form>
    </main>
  );
}
