"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AccountAlert, AccountShell } from "../components/account-shell";
import { useSiteLanguage } from "../lib/use-site-language";

type AccountUser = { id: string; fullName: string; email: string; phoneE164: string; accountStatus: string; emailStatus: string; phoneStatus: string; lastLoginAt: string | null };
type Plan = { id: string; name: string; users: number | null; assets: number | null; monthlyMnt: number | null; minPaidMonths: number; maxPaidMonths: number; allowMonths: boolean; allowYears: boolean; stepMonths: number };
type Subscription = { id: string; organizationName: string; planId: string; planName: string; durationMonths: number; baseAmountMnt: number | null; discountAmountMnt: number; finalAmountMnt: number | null; promotion: { nameMn?: string; nameEn?: string; textMn?: string; textEn?: string; bonusMonths?: number } | null; paymentStatus: string; subscriptionStatus: string; startsAt: string | null; endsAt: string | null; coreWorkspaceUrl: string | null; provisioningStatus: string; createdAt: string };
type AccountPayload = { user: AccountUser; subscription: Subscription | null; catalog: { plans: Plan[] } };

const statusLabel: Record<string, [string, string]> = {
  payment_pending: ["Төлбөрийн баталгаажуулалт хүлээгдэж байна", "Payment confirmation pending"],
  quote_requested: ["Үнийн санал хүссэн", "Quote requested"],
  provisioning_pending: ["iBeX eAM тенант бэлтгэж байна", "iBeX eAM tenant provisioning"],
  active: ["Идэвхтэй", "Active"], expired: ["Хугацаа дууссан", "Expired"], cancelled: ["Цуцлагдсан", "Cancelled"],
};

function safeTab() {
  if (typeof window === "undefined") return "overview";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return ["overview", "package", "security"].includes(tab || "") ? tab! : "overview";
}
function dateText(value: string | null, locale: string) { return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—"; }
function money(value: number | null, locale: string, isEnglish: boolean) { return value === null ? (isEnglish ? "Custom quote" : "Үнэ тохиролцоно") : `${new Intl.NumberFormat(locale).format(value)} ₮`; }

export default function AccountPage() {
  const { t, lang } = useSiteLanguage();
  const locale = lang === "en" ? "en-US" : "mn-MN", isEnglish = lang === "en";
  const [data, setData] = useState<AccountPayload | null>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [planId, setPlanId] = useState("plus");
  const [durationValue, setDurationValue] = useState("12");
  const [durationUnit, setDurationUnit] = useState<"month" | "year">("month");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/account/subscription", { cache: "no-store" }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      if (response?.status === 401) window.location.replace(`/login?return_to=${encodeURIComponent("/account")}`);
      else setError(payload.error || t("Бүртгэлийг ачаалж чадсангүй.", "Could not load your account."));
      setLoading(false); return;
    }
    const next = payload as AccountPayload, query = new URLSearchParams(window.location.search);
    setData(next); setOrganizationName((current) => current || next.subscription?.organizationName || "");
    const requestedPlan = query.get("plan"), requestedDuration = query.get("duration"), requestedUnit = query.get("unit");
    if (requestedPlan && next.catalog.plans.some((plan) => plan.id === requestedPlan)) setPlanId(requestedPlan);
    else if (next.subscription?.planId) setPlanId(next.subscription.planId);
    if (requestedDuration && /^\d{1,3}$/.test(requestedDuration)) setDurationValue(requestedDuration);
    if (requestedUnit === "month" || requestedUnit === "year") setDurationUnit(requestedUnit);
    setTab(safeTab()); setLoading(false);
  }, [t]);
  useEffect(() => { void load(); }, [load]);
  const selectedPlan = useMemo(() => data?.catalog.plans.find((plan) => plan.id === planId) || data?.catalog.plans[0], [data, planId]);
  useEffect(() => { if (!selectedPlan) return; if (durationUnit === "year" && !selectedPlan.allowYears) setDurationUnit("month"); if (durationUnit === "month" && !selectedPlan.allowMonths) setDurationUnit("year"); }, [selectedPlan, durationUnit]);

  function go(next: string) { setTab(next); const url = new URL(window.location.href); next === "overview" ? url.searchParams.delete("tab") : url.searchParams.set("tab", next); window.history.replaceState(null, "", `${url.pathname}${url.search}`); }
  async function logout() { await fetch("/api/account/logout", { method: "POST" }); window.location.replace("/"); }
  async function requestDeletion() { if (!window.confirm(t("Бүртгэл устгах 30 хоногийн хүсэлт үүсгэх үү?", "Start the 30-day account deletion request?"))) return; const response = await fetch("/api/account/deletion-request", { method: "POST" }); if (response.ok) { window.alert(t("Устгах хүсэлт бүртгэгдлээ. Бүртгэлээс гарлаа.", "Deletion request recorded. You have been signed out.")); window.location.replace("/"); } else setError(t("Устгах хүсэлтийг бүртгэж чадсангүй.", "Could not record the deletion request.")); }
  async function saveSubscription(event: FormEvent) {
    event.preventDefault(); setWorking(true); setError(""); setMessage("");
    const response = await fetch("/api/account/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationName, planId, durationValue: Number(durationValue), durationUnit }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(payload.error || t("Хүсэлтийг хадгалж чадсангүй.", "Could not save your request."));
    else { setMessage(t("Багцын хүсэлт хадгалагдлаа. Төлбөр баталгаажсаны дараа iBeX eAM тенант бэлтгэгдэнэ.", "Your plan request is saved. The iBeX eAM tenant will be prepared after payment confirmation.")); await load(); }
    setWorking(false);
  }

  const subscription = data?.subscription || null;
  const remaining = subscription?.endsAt ? Math.max(0, Math.ceil((new Date(subscription.endsAt).getTime() - Date.now()) / 86_400_000)) : null;
  const status = subscription ? statusLabel[subscription.subscriptionStatus] || [subscription.subscriptionStatus, subscription.subscriptionStatus] : null;
  return <AccountShell kicker="MY iBEX" titleMn={data?.user.fullName || "Миний iBeX"} titleEn={data?.user.fullName || "My iBeX"} introMn="Багц, урамшуулал, Home AI болон iBeX eAM ажлын орчинд нэвтрэх мэдээллээ эндээс удирдана." introEn="Manage your plan, promotion, Home AI and access to the iBeX eAM workspace here.">
    {loading ? <AccountAlert type="notice">{t("Бүртгэлийг ачаалж байна…", "Loading your account…")}</AccountAlert> : null}
    {error ? <AccountAlert type="error">{error}</AccountAlert> : null}
    {message ? <AccountAlert type="success">{message}</AccountAlert> : null}
    {data ? <>
      <nav className="my-ibex-tabs" aria-label={t("Миний iBeX цэс", "My iBeX navigation")}>
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => go("overview")}>{t("Тойм", "Overview")}</button><button type="button" className={tab === "package" ? "active" : ""} onClick={() => go("package")}>{t("Миний багц", "My plan")}</button><Link href="/account/home-ai">Home AI</Link><button type="button" className={tab === "security" ? "active" : ""} onClick={() => go("security")}>{t("Бүртгэл ба аюулгүй байдал", "Account & security")}</button>
      </nav>
      {tab === "overview" ? <section className="my-ibex-panel"><div className="my-ibex-overview-grid"><article><small>{t("Байгууллага", "Organization")}</small><strong>{subscription?.organizationName || t("Байгууллага сонгоогүй", "No organization selected")}</strong><span>{t("Эхний тенант админ", "First tenant administrator")}</span></article><article><small>{t("Одоогийн багц", "Current plan")}</small><strong>{subscription?.planName || "—"}</strong><span className={subscription?.subscriptionStatus === "active" ? "verified" : "pending"}>{status ? t(status[0], status[1]) : t("Багц сонгоно уу", "Choose a plan")}</span></article><article><small>{t("Хугацаа", "Term")}</small><strong>{subscription?.endsAt ? `${remaining} ${t("хоног үлдсэн", "days remaining")}` : "—"}</strong><span>{subscription?.startsAt ? `${dateText(subscription.startsAt, locale)} — ${dateText(subscription.endsAt, locale)}` : t("Төлбөр баталгаажсаны дараа тогтооно", "Set after payment confirmation")}</span></article></div><div className="my-ibex-workspace-card"><div><span>iBeX eAM</span><h2>{t("Ажлын орчин", "Operational workspace")}</h2><p>{t("eAM-д багц, төлбөр, урамшууллын төлөв харагдахгүй. Зөвхөн таны эрхийн дагуух ажлын талбар нээгдэнэ.", "eAM never shows plan, payment or promotion states. It opens only the operational workspace allowed by your entitlement.")}</p></div>{subscription?.subscriptionStatus === "active" && subscription.coreWorkspaceUrl ? <a className="account-primary-link" href={subscription.coreWorkspaceUrl}>{t("iBeX eAM нээх ↗", "Open iBeX eAM ↗")}</a> : <button type="button" onClick={() => go("package")}>{subscription ? t("Тенант бэлтгэгдэж байна", "Tenant preparation in progress") : t("Багц сонгох", "Choose a plan")}</button>}</div>{subscription?.promotion ? <div className="my-ibex-promotion"><small>{t("Авсан урамшуулал", "Applied promotion")}</small><strong>{isEnglish ? subscription.promotion.nameEn || subscription.promotion.textEn : subscription.promotion.nameMn || subscription.promotion.textMn}</strong><span>{subscription.promotion.bonusMonths ? t(`${subscription.promotion.bonusMonths} сарын үнэгүй хугацаа`, `${subscription.promotion.bonusMonths} free month(s)`) : t("Үнийн хөнгөлөлт тооцогдсон", "Price discount applied")}</span></div> : null}</section> : null}
      {tab === "package" ? <section className="my-ibex-panel my-package-panel"><div className="my-package-heading"><div><span>PLAN REQUEST</span><h2>{t("Миний багц", "My plan")}</h2><p>{t("Энд баталсан сонголт Home Web дээр хадгалагдаж, төлбөр батлагдсаны дараа тенант нээх мэдээлэл iBeX eAM-д дамжина.", "Your confirmed selection is retained in Home Web and is sent to iBeX eAM to create a tenant after payment confirmation.")}</p></div>{subscription ? <div className="my-package-status"><strong>{t(status?.[0] || "", status?.[1] || "")}</strong><small>{t("Хүсэлт", "Request")} · {dateText(subscription.createdAt, locale)}</small></div> : null}</div>{subscription ? <div className="my-package-summary"><span>{subscription.planName}</span><strong>{money(subscription.finalAmountMnt, locale, isEnglish)}</strong><small>{subscription.durationMonths} {t("сар", "month(s)")} · {subscription.discountAmountMnt ? t("Урамшуулал тооцогдсон", "Promotion applied") : t("Стандарт үнэ", "Standard price")}</small></div> : null}<form className="account-form my-package-form" onSubmit={saveSubscription}><label>{t("Байгууллагын нэр", "Organization name")}<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required maxLength={160} placeholder={t("Тенантын нэр", "Tenant name")} /></label><label>{t("Багц", "Plan")}<select value={planId} onChange={(event) => setPlanId(event.target.value)}>{data.catalog.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.monthlyMnt === null ? ` · ${t("Тохиролцоно", "Custom")}` : ` · ${money(plan.monthlyMnt, locale, isEnglish)}/${t("сар", "month")}`}</option>)}</select></label><div className="my-package-duration"><label>{t("Хугацаа", "Duration")}<input type="number" min={durationUnit === "year" ? Math.ceil((selectedPlan?.minPaidMonths || 1) / 12) : selectedPlan?.minPaidMonths || 1} max={durationUnit === "year" ? Math.floor((selectedPlan?.maxPaidMonths || 12) / 12) : selectedPlan?.maxPaidMonths || 120} value={durationValue} onChange={(event) => setDurationValue(event.target.value)} required /></label><label>{t("Нэгж", "Unit")}<select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value as "month" | "year")}><option value="month" disabled={!selectedPlan?.allowMonths}>{t("Сар", "Month")}</option><option value="year" disabled={!selectedPlan?.allowYears}>{t("Жил", "Year")}</option></select></label><small>{selectedPlan ? t(`Админ тохируулсан хязгаар: ${selectedPlan.minPaidMonths}–${selectedPlan.maxPaidMonths} сар.`, `Administrator limit: ${selectedPlan.minPaidMonths}–${selectedPlan.maxPaidMonths} months.`) : ""}</small></div><button className="account-submit" type="submit" disabled={working}>{working ? t("Хадгалж байна…", "Saving…") : selectedPlan?.monthlyMnt === null ? t("Үнийн санал хүсэх", "Request a quote") : t("Багцын хүсэлтийг батлах", "Confirm plan request")}</button></form><p className="my-package-boundary">{t("Төлбөр баталгаажаагүй үед iBeX eAM ажлын орчин нээгдэхгүй. Төлбөр болон баталгаажуулалтыг зөвхөн Home Web удирдана.", "The iBeX eAM workspace stays closed until payment is confirmed. Only Home Web manages payment and confirmation.")}</p></section> : null}
      {tab === "security" ? <section className="my-ibex-panel"><div className="account-status-grid"><article><small>{t("И-мэйл", "Email")}</small><strong>{data.user.email}</strong><span className="verified">✓ {t("Баталгаажсан", "Verified")}</span></article><article><small>{t("Гар утас", "Mobile")}</small><strong>{data.user.phoneE164}</strong><span className="pending">{data.user.phoneStatus === "verified" ? t("Баталгаажсан", "Verified") : t("SMS баталгаажуулалт хүлээгдэж байна", "SMS verification pending")}</span></article><article><small>{t("Home AI", "Home AI")}</small><strong>{t("Идэвхтэй веб эрх", "Website access active")}</strong><span>{t("Зөвхөн нийтэд зөвшөөрсөн эх сурвалж ашиглана", "Uses approved public sources only")}</span></article></div><div className="account-actions"><button type="button" className="account-primary-link" onClick={logout}>{t("Гарах", "Sign out")}</button><Link href="/">{t("Нүүр хуудас", "Home")}</Link><button type="button" className="account-danger-link" onClick={requestDeletion}>{t("Бүртгэл устгах хүсэлт", "Request account deletion")}</button></div></section> : null}
    </> : null}
  </AccountShell>;
}
