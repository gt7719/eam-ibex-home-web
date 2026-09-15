"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import { defaultLaunchOffer, launchOfferText, type LaunchOffer, type PlanOffer } from "../../lib/launch-offer-model";

export default function LaunchOfferEditor() {
  const { t } = useSiteLanguage();
  const [offer, setOffer] = useState<LaunchOffer>(() => structuredClone(defaultLaunchOffer));
  const [active, setActive] = useState("free"), [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [savedSnapshot, setSavedSnapshot] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/launch-offer", { cache: "no-store" });
      if (response.status === 401) { window.location.replace("/admin/login"); return; }
      if (response.status === 403) { window.location.replace("/admin"); return; }
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setOffer(data.offer); setRevision(data.revision); setSavedSnapshot(JSON.stringify(data.offer)); setReady(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Холболтоо шалгана уу.", "Check your connection.")); }
  }, [t]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const dirty = Boolean(savedSnapshot && JSON.stringify(offer) !== savedSnapshot);
  useEffect(() => { window.dispatchEvent(new CustomEvent("ibex-launch-dirty", { detail: dirty })); }, [dirty]);
  const plan = offer.plans.find(row => row.planId === active) || offer.plans[0];
  function update<K extends keyof PlanOffer>(key: K, value: PlanOffer[K]) {
    setOffer(current => ({ ...current, plans: current.plans.map(row => row.planId === active ? { ...row, [key]: value } : row) })); setMessage("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/launch-offer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, revision }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || t("Хадгалж чадсангүй.", "Could not save."));
      setOffer(data.offer); setRevision(data.revision); setSavedSnapshot(JSON.stringify(data.offer)); setMessage(t("Багцын урамшууллыг хадгаллаа.", "Plan offers saved."));
      window.parent.postMessage({ type: "ibex-launch-offer-updated" }, window.location.origin);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Дахин оролдоно уу.", "Please retry.")); } finally { setSaving(false); }
  }
  if (!plan) return null;
  return <form className="pricing-admin-section launch-offer-editor" onSubmit={save}>
    <div className="pricing-admin-section-head"><span className="admin-step">02</span><h2>{t("Багц тус бүрийн урамшуулал", "Per-plan offers")}</h2><p>{t("Үнэгүй хугацаа болон үнийн хөнгөлөлтийг тусад нь удирдана. Хоёуланг хэрэглэх бол давхардуулахыг ил тод зөвшөөрнө.", "Manage free duration and price discounts separately. Explicitly allow stacking when both apply.")}</p></div>
    {error && <div className="knowledge-alert error" role="alert">{error} <button type="button" onClick={() => void load()}>{t("Дахин ачаалах", "Reload")}</button></div>}{message && <div className="knowledge-alert success" role="status">{message}</div>}
    <div className="offer-plan-tabs" role="tablist">{offer.plans.map(row => <button id={`offer-tab-${row.planId}`} aria-controls="offer-plan-panel" type="button" role="tab" aria-selected={row.planId === active} className={row.planId === active ? "active" : ""} key={row.planId} onClick={() => setActive(row.planId)}>{row.planId[0].toUpperCase() + row.planId.slice(1)}{row.bonusEnabled || row.discountEnabled ? " ✓" : ""}</button>)}</div>
    <fieldset id="offer-plan-panel" role="tabpanel" aria-labelledby={`offer-tab-${plan.planId}`} className="launch-offer-fields" disabled={!ready || saving}>
      <label>{t("Саналын нэр", "Offer name")} · MN<input maxLength={100} value={plan.nameMn} onChange={e => update("nameMn", e.target.value)} /></label>
      <label>Offer name · EN<input maxLength={100} value={plan.nameEn} onChange={e => update("nameEn", e.target.value)} /></label>
      <section className="offer-benefit-card wide"><label className="offer-checkbox"><input type="checkbox" checked={plan.bonusEnabled} onChange={e => update("bonusEnabled", e.target.checked)} /><span>{t("Үнэгүй хугацааны урамшуулал", "Free-duration bonus")}</span></label><div className="offer-duration-row"><label>{t("Хугацаа", "Duration")}<input disabled={!plan.bonusEnabled} type="number" min="1" max={plan.bonusUnit === "day" ? 3650 : plan.bonusUnit === "month" ? 120 : 10} value={plan.bonusValue} onChange={e => update("bonusValue", Number(e.target.value))} /></label><label>{t("Нэгж", "Unit")}<select disabled={!plan.bonusEnabled} value={plan.bonusUnit} onChange={e => update("bonusUnit", e.target.value as PlanOffer["bonusUnit"])}><option value="day">{t("Өдөр", "Days")}</option><option value="month">{t("Сар", "Months")}</option><option value="year">{t("Жил", "Years")}</option></select></label></div></section>
      <section className="offer-benefit-card wide"><label className="offer-checkbox"><input type="checkbox" disabled={plan.planId === "free"} checked={plan.discountEnabled} onChange={e => update("discountEnabled", e.target.checked)} /><span>{t("Үнийн хөнгөлөлт", "Price discount")}{plan.planId === "free" ? <small>{t("Free багцад хэрэглэхгүй", "Not available for Free")}</small> : null}</span></label><div className="offer-duration-row"><label>{t("Төрөл", "Type")}<select disabled={!plan.discountEnabled || plan.planId === "free"} value={plan.discountType} onChange={e => update("discountType", e.target.value as PlanOffer["discountType"])}><option value="percent">%</option><option value="fixed">{t("Тогтмол MNT", "Fixed MNT")}</option><option value="special">{t("Тусгай үнэ", "Special price")}</option></select></label><label>{plan.discountType === "special" ? t("Тусгай үнэ · MNT", "Special price · MNT") : t("Хөнгөлөлтийн утга", "Discount value")}<input disabled={!plan.discountEnabled || plan.planId === "free"} type="number" min="0" max="1000000000" value={plan.discountType === "special" ? (plan.specialPriceMnt ?? "") : plan.discountValue} onChange={e => plan.discountType === "special" ? update("specialPriceMnt", e.target.value === "" ? null : Number(e.target.value)) : update("discountValue", Number(e.target.value))} /></label></div></section>
      <label>{t("Эхлэх огноо", "Start date")}<input type="date" value={plan.startDate} onChange={e => update("startDate", e.target.value)} /></label><label>{t("Дуусах огноо", "End date")}<input type="date" value={plan.endDate} onChange={e => update("endDate", e.target.value)} /></label>
      <label className="offer-checkbox wide"><input type="checkbox" disabled={!plan.bonusEnabled || !plan.discountEnabled} checked={plan.combineBenefits} onChange={e => update("combineBenefits", e.target.checked)} />{t("Хугацааны бонус ба үнийн хөнгөлөлтийг давхар хэрэглэх", "Stack duration bonus and price discount")}</label>
      <label>{t("Тусгай текст", "Custom text")} · MN<textarea maxLength={240} rows={2} value={plan.textMn} onChange={e => update("textMn", e.target.value)} /></label><label>Custom text · EN<textarea maxLength={240} rows={2} value={plan.textEn} onChange={e => update("textEn", e.target.value)} /></label>
      <div className="wide offer-text-preview"><span>{t("Урьдчилсан харагдац", "Preview")}</span><p>{launchOfferText(plan, "mn") || "—"}</p><p>{launchOfferText(plan, "en") || "—"}</p></div>
    </fieldset>
    <div className="payment-admin-actions"><span>{t("Нэг багцад тус бүр нэг идэвхтэй хугацааны бонус, нэг үнийн хөнгөлөлт байна.", "Each plan has at most one active duration bonus and one price discount.")}</span><button type="submit" disabled={!ready || saving}>{saving ? t("Хадгалж байна…", "Saving…") : t("Бүх урамшуулал хадгалах", "Save all offers")}</button></div>
  </form>;
}
