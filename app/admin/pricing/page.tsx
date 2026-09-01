"use client";

import { FormEvent, useEffect, useState } from "react";

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
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
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
    if (!response?.ok) setError(payload.error || "Төлбөрийн тохиргоог хадгалж чадсангүй.");
    else { setMethods(payload.methods || methods); setMessage("Төлбөрийн хэлбэрийн тохиргоог хадгаллаа."); }
    setSaving(false);
  }

  return (
    <main className="pricing-admin-page">
      <header className="pricing-admin-header">
        <a href="/admin" className="admin-users-back">← Сайтын админ</a>
        <div><span className="admin-auth-kicker">PRICING &amp; CHECKOUT</span><h1>Үнэ ба төлбөр</h1><p>Багцын MNT үнэ, жилийн хөнгөлөлт болон төлбөрийн аргыг зөвхөн эрхтэй админ удирдана.</p></div>
      </header>
      {error ? <div className="knowledge-alert error" role="alert">{error}</div> : null}
      {message ? <div className="knowledge-alert success" role="status">{message}</div> : null}
      <section className="pricing-admin-section">
        <div className="pricing-admin-section-head"><span className="admin-step">01</span><h2>Багцын шаталсан тохиргоо</h2><p>Free → Go → Plus → Pro → Custom дарааллаар сарын MNT үнэ, жилийн хямдрал, хэрэглэгч, хөрөнгө болон цэсийг тогтооно.</p></div>
        <iframe className="package-admin-frame" src="/package-admin.html" title="Багцын шаталсан тохиргоо" />
      </section>
      <form className="pricing-admin-section payment-admin-section" onSubmit={save}>
        <div className="pricing-admin-section-head"><span className="admin-step">02</span><h2>Төлбөрийн хэлбэр</h2><p>Нийтийн BUY цонхонд харуулах хэлбэрийг идэвхжүүлнэ. Банкнаас өгсөн HTTPS checkout холбоосыг л оруулна.</p></div>
        {loading ? <p className="admin-users-empty">Тохиргоог уншиж байна…</p> : <div className="payment-admin-grid">{methods.map((method) => (
          <article className="payment-admin-card" key={method.id}>
            <div className="payment-admin-title"><strong>{methodNames[method.id]}</strong><label><input type="checkbox" checked={method.enabled} onChange={(event) => update(method.id, "enabled", event.target.checked)} /> Харуулах</label></div>
            <label>Нэр · MN<input value={method.labelMn} onChange={(event) => update(method.id, "labelMn", event.target.value)} /></label>
            <label>Name · EN<input value={method.labelEn} onChange={(event) => update(method.id, "labelEn", event.target.value)} /></label>
            <label>Тайлбар · MN<input value={method.detailMn} onChange={(event) => update(method.id, "detailMn", event.target.value)} /></label>
            <label>Description · EN<input value={method.detailEn} onChange={(event) => update(method.id, "detailEn", event.target.value)} /></label>
            <label className="wide">Банкны checkout холбоос<input type="url" value={method.checkoutUrl} onChange={(event) => update(method.id, "checkoutUrl", event.target.value)} placeholder="https://bank-or-gateway.example/checkout" /></label>
          </article>
        ))}</div>}
        <div className="payment-admin-actions"><small>Merchant secret, API key болон callback нууц мэдээллийг энд оруулахгүй. Тэдгээр нь зөвхөн серверийн хамгаалагдсан орчинд байна.</small><button type="submit" disabled={saving || loading}>{saving ? "Хадгалж байна…" : "Төлбөрийн тохиргоо хадгалах"}</button></div>
      </form>
    </main>
  );
}
