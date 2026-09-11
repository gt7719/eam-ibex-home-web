"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import type { BankApp, PaymentMethod } from "../../lib/payment-settings";
import LaunchOfferEditor from "./launch-offer-editor";

const methodNames: Record<PaymentMethod["id"], string> = { card: "Банкны карт", qr: "Банкны QR", bank_app: "Банкны апп", transfer: "Дансаар шилжүүлэх", other: "Бусад" };

export default function PricingAdminPage() {
  const { t } = useSiteLanguage();
  const [embedded, setEmbedded] = useState(false), [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [uploading, setUploading] = useState("");
  const [message, setMessage] = useState(""), [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setEmbedded(new URLSearchParams(window.location.search).get("embedded") === "1"), 0);
    fetch("/api/admin/payment-settings", { cache: "no-store" }).then(async response => {
      if (response.status === 401) { window.location.replace("/admin/login"); return; }
      if (response.status === 403) { window.location.replace("/admin"); return; }
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Төлбөрийн тохиргоог уншиж чадсангүй.");
      setMethods(payload.methods || []); setLoading(false);
    }).catch(reason => { setError(reason instanceof Error ? reason.message : "Төлбөрийн тохиргоог уншиж чадсангүй."); setLoading(false); });
    return () => window.clearTimeout(timer);
  }, []);

  function update(id: PaymentMethod["id"], key: keyof PaymentMethod, value: string | boolean | BankApp[]) {
    setMethods(current => current.map(method => method.id === id ? { ...method, [key]: value } : method)); setMessage("");
  }
  function updateApp(appId: string, key: keyof BankApp, value: string | boolean) {
    setMethods(current => current.map(method => method.id !== "bank_app" ? method : { ...method, apps: method.apps.map(app => app.id === appId ? { ...app, [key]: value } : app) })); setMessage("");
  }
  function addApp() {
    const app: BankApp = { id: crypto.randomUUID(), nameMn: "", nameEn: "", imageUrl: "", bankUrl: "", enabled: false };
    setMethods(current => current.map(method => method.id === "bank_app" ? { ...method, apps: [...method.apps, app] } : method));
  }
  function moveApp(appId: string, direction: -1 | 1) {
    setMethods(current => current.map(method => {
      if (method.id !== "bank_app") return method;
      const index = method.apps.findIndex(app => app.id === appId), target = index + direction;
      if (index < 0 || target < 0 || target >= method.apps.length) return method;
      const apps = [...method.apps]; [apps[index], apps[target]] = [apps[target], apps[index]]; return { ...method, apps };
    }));
  }
  async function uploadImage(file: File, target: "qr" | string) {
    setUploading(target); setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || t("Зургийг байршуулж чадсангүй.", "Could not upload image."));
      if (target === "qr") update("qr", "imageUrl", payload.url); else updateApp(target, "imageUrl", payload.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Зургийг байршуулж чадсангүй.", "Could not upload image.")); }
    finally { setUploading(""); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const response = await fetch("/api/admin/payment-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ methods }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(payload.error || t("Төлбөрийн тохиргоог хадгалж чадсангүй.", "Could not save payment settings."));
    else { setMethods(payload.methods || methods); setMessage(t("Төлбөрийн хэлбэрийн тохиргоог хадгаллаа.", "Payment method settings were saved.")); }
    setSaving(false);
  }

  return <main className={`pricing-admin-page${embedded ? " embedded-admin-page" : ""}`}>
    <header className="pricing-admin-header"><a href="/admin" className="admin-users-back">← {t("Сайтын админ", "Site administration")}</a><div><span className="admin-auth-kicker">PRICING &amp; CHECKOUT</span><h1>{t("Үнэ ба төлбөр", "Pricing and payments")}</h1><p>{t("Багцын MNT үнэ, урамшуулал болон төлбөрийн аргыг эрхтэй админ удирдана.", "Authorized administrators manage MNT prices, offers and payment methods.")}</p></div></header>
    {error && <div className="knowledge-alert error" role="alert">{error}</div>}{message && <div className="knowledge-alert success" role="status">{message}</div>}
    <section className="pricing-admin-section"><div className="pricing-admin-section-head"><span className="admin-step">01</span><h2>{t("Багцын шаталсан тохиргоо", "Tiered package configuration")}</h2><p>{t("Free → Go → Plus → Pro → Custom дарааллаар сарын MNT үнэ, жилийн хямдрал, хэрэглэгч, хөрөнгө болон цэсийг тогтооно.", "Configure monthly MNT prices, annual discounts, users, assets and menus in Free → Go → Plus → Pro → Custom order.")}</p></div><iframe className="package-admin-frame" src="/package-admin.html" title={t("Багцын шаталсан тохиргоо", "Tiered package configuration")} /></section>
    <LaunchOfferEditor />
    <form className="pricing-admin-section payment-admin-section" onSubmit={save}>
      <div className="pricing-admin-section-head"><span className="admin-step">03</span><h2>{t("Төлбөрийн хэлбэр", "Payment methods")}</h2><p>{t("QR болон банкны аппын зургийг төхөөрөмжөөс шууд сонгоно. Банкны апп бүрд тусдаа HTTPS холбоос тохируулна.", "Upload QR and bank-app images directly, and configure a separate HTTPS link for each bank app.")}</p></div>
      {loading ? <p className="admin-users-empty">{t("Тохиргоог уншиж байна…", "Loading settings…")}</p> : <div className="payment-admin-grid">{methods.map(method => <article className="payment-admin-card" key={method.id}>
        <div className="payment-admin-title"><strong>{t(methodNames[method.id], method.labelEn || methodNames[method.id])}</strong><label><input type="checkbox" checked={method.enabled} onChange={event => update(method.id, "enabled", event.target.checked)} /> {t("Харуулах", "Show")}</label></div>
        <label>{t("Нэр", "Name")} · MN<input value={method.labelMn} onChange={event => update(method.id, "labelMn", event.target.value)} /></label>
        <label>Name · EN<input value={method.labelEn} onChange={event => update(method.id, "labelEn", event.target.value)} /></label>
        <label>{t("Тайлбар", "Description")} · MN<input value={method.detailMn} onChange={event => update(method.id, "detailMn", event.target.value)} /></label>
        <label>Description · EN<input value={method.detailEn} onChange={event => update(method.id, "detailEn", event.target.value)} /></label>
        {method.id !== "qr" && method.id !== "bank_app" && <label className="wide">{t("Банкны checkout холбоос", "Bank checkout URL")}<input type="url" value={method.checkoutUrl} onChange={event => update(method.id, "checkoutUrl", event.target.value)} placeholder="https://bank-or-gateway.example/checkout" /></label>}
        {method.id === "qr" && <div className="payment-media-editor wide"><div>{method.imageUrl ? <img src={method.imageUrl} alt={t("Банкны QR урьдчилсан харагдац", "Bank QR preview")} /> : <span>QR</span>}</div><label>{t("QR зураг сонгох", "Choose QR image")}<input type="file" accept="image/*" disabled={uploading === "qr"} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "qr"); event.target.value = ""; }} /></label>{method.imageUrl && <button type="button" onClick={() => update("qr", "imageUrl", "")}>{t("Зураг авах", "Remove image")}</button>}<small>{uploading === "qr" ? t("Байршуулж байна…", "Uploading…") : t("PNG, JPG, WEBP эсвэл SVG зураг.", "PNG, JPG, WEBP or SVG image.")}</small></div>}
        {method.id === "bank_app" && <section className="bank-app-editor wide"><header><div><strong>{t("Банкны аппууд", "Bank apps")}</strong><small>{t("Апп бүрийн зураг болон дарахад нээгдэх холбоосыг тусад нь оруулна.", "Set each app image and its click-through link separately.")}</small></div><button type="button" onClick={addApp}>+ {t("Апп нэмэх", "Add app")}</button></header>{method.apps.length ? <div className="bank-app-list">{method.apps.map((app, index) => <article className="bank-app-row" key={app.id}>
          <div className="bank-app-order"><b>{String(index + 1).padStart(2, "0")}</b><button type="button" disabled={index === 0} onClick={() => moveApp(app.id, -1)}>↑</button><button type="button" disabled={index === method.apps.length - 1} onClick={() => moveApp(app.id, 1)}>↓</button></div>
          <div className="bank-app-image">{app.imageUrl ? <img src={app.imageUrl} alt="" /> : <span>APP</span>}<label>{t("Аппын зураг", "App image")}<input type="file" accept="image/*" disabled={uploading === app.id} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file, app.id); event.target.value = ""; }} /></label>{app.imageUrl && <button type="button" onClick={() => updateApp(app.id, "imageUrl", "")}>{t("Авах", "Remove")}</button>}</div>
          <label>{t("Аппын нэр", "App name")} · MN<input value={app.nameMn} onChange={event => updateApp(app.id, "nameMn", event.target.value)} /></label><label>App name · EN<input value={app.nameEn} onChange={event => updateApp(app.id, "nameEn", event.target.value)} /></label><label className="bank-app-url">{t("Банкны холбоос", "Bank link")}<input type="url" value={app.bankUrl} placeholder="https://bank.example/pay" onChange={event => updateApp(app.id, "bankUrl", event.target.value)} /></label>
          <label className="bank-app-enabled"><input type="checkbox" checked={app.enabled} onChange={event => updateApp(app.id, "enabled", event.target.checked)} />{t("Харуулах", "Show")}</label><button className="bank-app-delete" type="button" onClick={() => update("bank_app", "apps", method.apps.filter(item => item.id !== app.id))}>×</button>
        </article>)}</div> : <p className="bank-app-empty">{t("Банкны апп нэмээгүй байна.", "No bank apps added.")}</p>}</section>}
      </article>)}</div>}
      <div className="payment-admin-actions"><small>{t("Merchant secret, API key болон callback нууц мэдээллийг энд оруулахгүй. Зөвхөн нийтэд харагдах зураг ба банкны HTTPS холбоос оруулна.", "Do not enter merchant secrets, API keys or callback secrets. Add only public images and bank-provided HTTPS links.")}</small><button type="submit" disabled={saving || loading || !!uploading}>{saving ? t("Хадгалж байна…", "Saving…") : t("Төлбөрийн тохиргоо хадгалах", "Save payment settings")}</button></div>
    </form>
  </main>;
}
