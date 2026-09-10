"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import { defaultLaunchOffer, launchOfferText, type LaunchOffer } from "../../lib/launch-offer-model";
import { tierNames } from "../../../public/package-model.mjs";

export default function LaunchOfferEditor() {
  const { t } = useSiteLanguage();
  const [offer, setOffer] = useState<LaunchOffer>({ ...defaultLaunchOffer, planIds: [] });
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/launch-offer", { cache: "no-store" });
      if (response.status === 401) { window.location.replace("/admin/login"); return; }
      if (response.status === 403) { window.location.replace("/admin"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Урамшууллыг уншиж чадсангүй. / Could not load offer.");
      setOffer(data.offer); setRevision(data.revision); setReady(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Холболтоо шалгана уу. / Check your connection."); }
  }, []);
  // load only updates state after the network request settles.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  function update<K extends keyof LaunchOffer>(key: K, value: LaunchOffer[K]) {
    setOffer(current => ({ ...current, [key]: value })); setMessage("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/launch-offer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("Хадгалж чадсангүй.", "Could not save."));
      setOffer(data.offer); setRevision(data.revision);
      setMessage(t("Нээлтийн урамшууллыг хадгаллаа.", "Launch offer saved."));
      window.parent.postMessage({ type: "ibex-launch-offer-updated" }, window.location.origin);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("Холболтоо шалган дахин оролдоно уу.", "Check your connection and retry.")); }
    finally { setSaving(false); }
  }
  return <form className="pricing-admin-section launch-offer-editor" onSubmit={save}>
    <div className="pricing-admin-section-head"><span className="admin-step">02</span><h2>{t("Нээлтийн урамшуулал", "Launch offer")}</h2><p>{t("Үнэ хэсэгт харуулах урамшууллын мэдээллийг тохируулна. Хугацаа дуусахад автоматаар харагдахаа болино.", "Configure the offer displayed in Pricing. It is hidden automatically when it expires.")}</p></div>
    {error && <div className="knowledge-alert error" role="alert">{error} <button type="button" disabled={saving} onClick={() => { setReady(false); setError(""); setMessage(""); void load(); }}>{t("Тохиргоог дахин ачаалах", "Reload settings")}</button></div>}
    {message && <div className="knowledge-alert success" role="status">{message}</div>}
    {!ready && !error && <p className="admin-users-empty">{t("Тохиргоог уншиж байна…", "Loading settings…")}</p>}
    <fieldset className="launch-offer-fields" disabled={!ready || saving}>
      <label>{t("Үнэгүй ашиглах сарын тоо", "Free months")}<input type="number" min="1" max="120" step="1" required value={Number.isFinite(offer.freeMonths) ? offer.freeMonths : ""} onChange={event => update("freeMonths", event.target.value === "" ? NaN : Number(event.target.value))} /></label>
      <label>{t("Хамаарах багц", "Applicable plans")}<select value={offer.scope} onChange={event => update("scope", event.target.value as LaunchOffer["scope"])}><option value="all">{t("Бүх багц", "All plans")}</option><option value="selected">{t("Сонгосон багц", "Selected plans")}</option></select></label>
      {offer.scope === "selected" && <fieldset className="offer-plan-selection wide"><legend>{t("Багц сонгох", "Select plans")}</legend>{tierNames.map((name: string) => <label key={name}><input type="checkbox" checked={offer.planIds.includes(name.toLowerCase())} onChange={event => update("planIds", event.target.checked ? [...offer.planIds, name.toLowerCase()] : offer.planIds.filter(id => id !== name.toLowerCase()))} />{name}</label>)}</fieldset>}
      <label>{t("Эхлэх огноо", "Start date")}<input type="date" required={offer.enabled} value={offer.startDate} onChange={event => update("startDate", event.target.value)} /></label>
      <label>{t("Дуусах огноо", "End date")}<input type="date" required={offer.enabled} min={offer.startDate || undefined} value={offer.endDate} onChange={event => update("endDate", event.target.value)} /></label>
      <p className="wide offer-hint">{t("Улаанбаатарын цагаар эхлэх өдрийн 00:00-ээс дуусах өдрийг дуустал хүчинтэй.", "Valid from 00:00 on the start date through the end date, Ulaanbaatar time.")}</p>
      <label>{t("Урамшууллын текст", "Offer text")} · MN<textarea maxLength={240} rows={3} value={offer.textMn} placeholder="Нээлтийн урамшуулал — эхний {months} сар үнэгүй" onChange={event => update("textMn", event.target.value)} /></label>
      <label>Offer text · EN<textarea maxLength={240} rows={3} value={offer.textEn} placeholder="Launch offer — first {months} months free" onChange={event => update("textEn", event.target.value)} /></label>
      <p className="wide offer-hint">{t("Хоосон үлдээвэл текст автоматаар үүснэ. Өөрийн текстэд {months} гэж оруулбал сарын тоогоор солигдоно.", "Leave blank for automatic text. Use {months} in custom text to insert the number of months.")}</p>
      <label className="offer-checkbox"><input type="checkbox" checked={offer.enabled} onChange={event => update("enabled", event.target.checked)} />{t("Идэвхтэй", "Active")}</label>
      <p className="offer-hint">{t("Идэвхтэй гэж хадгалмагц зар шууд харагдана. Эхлэх хугацаа болоогүй бол эхлэх огноог хамт харуулна.", "Saving as active shows the announcement immediately, including the start date for upcoming offers.")}</p>
      <div className="wide offer-text-preview"><span>{t("Текстийн урьдчилсан харагдац", "Text preview")}</span><p lang="mn">{launchOfferText(offer, "mn")}</p><p lang="en">{launchOfferText(offer, "en")}</p></div>
    </fieldset>
    <div className="payment-admin-actions"><span>{t("Өөрчлөлт хадгалсны дараа үйлчилнэ.", "Changes take effect after saving.")}</span><button type="submit" disabled={!ready || saving}>{saving ? t("Хадгалж байна…", "Saving…") : t("Урамшуулал хадгалах", "Save offer")}</button></div>
  </form>;
}
