"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import type { HomeAiControlSettings } from "../../lib/home-ai-control";
import "./style.css";

type Payload = {
  settings: HomeAiControlSettings;
  revision: string | null;
  status: {
    keyConfigured: boolean;
    identitySaltConfigured: boolean;
    approvedSources: number;
    readyForTest: boolean;
    rawChatStored: false;
    historyMessages: number;
    externalActions: false;
    separateFromMarketingAi: true;
    separateFromIntelligentAi: true;
  };
  usage: {
    month: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    activeSubjects: number;
    authoritativeBilling: string;
  };
  audit: Array<{ eventType: string; model: string | null; status: string; createdAt: string }>;
};

const emptySettings: HomeAiControlSettings = {
  mode: "test", fastModel: "gpt-5.6-luna", complexModel: "gpt-5.6-terra",
  monthlyBudgetUsd: 10, warningBudgetUsd: 5, criticalBudgetUsd: 8,
  minimumFairShareUsd: .25, requestsPerMinute: 6, requestsPerDay: 10, maxOutputTokens: 520,
};

export default function HomeAiControlPage() {
  const { t } = useSiteLanguage();
  const [embedded] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embedded") === "1");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [settings, setSettings] = useState<HomeAiControlSettings>(emptySettings);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/admin/home-ai-control", { cache: "no-store" }).catch(() => null);
    const next = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      if (response?.status === 401) window.location.replace("/admin/login");
      else if (response?.status === 403) window.location.replace("/admin");
      setError(next.error || t("Home AI удирдлагыг ачаалж чадсангүй.", "Could not load Home AI controls."));
    } else { setPayload(next); setSettings(next.settings); }
    setLoading(false);
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  const budgetPercent = useMemo(() => Math.min(100, Math.max(0, ((payload?.usage.estimatedCostUsd || 0) / Math.max(1, settings.monthlyBudgetUsd)) * 100)), [payload, settings.monthlyBudgetUsd]);
  const updateNumber = (key: keyof HomeAiControlSettings, value: string) => setSettings(current => ({ ...current, [key]: Number(value) }));

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/home-ai-control", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings, revision: payload?.revision ?? null }) }).catch(() => null);
    const next = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(next.error || t("Тохиргоог хадгалж чадсангүй.", "Could not save settings."));
    else { setMessage(t("Home AI тохиргоог хадгаллаа.", "Home AI settings saved.")); await load(); }
    setSaving(false);
  }

  async function runTest() {
    setTesting(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/home-ai-control/test", { method: "POST" }).catch(() => null);
    const next = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) setError(next.error || t("Холболтын тест амжилтгүй боллоо.", "Connection test failed."));
    else { setMessage(`${t("Холболт хэвийн", "Connection healthy")} · ${next.model} · ${next.latencyMs} ms${next.message ? ` · ${next.message}` : ""}`); await load(); }
    setTesting(false);
  }

  if (loading && !payload) return <main className="home-ai-control-state">{t("Home AI удирдлагыг ачаалж байна…", "Loading Home AI controls…")}</main>;
  const status = payload?.status;
  const usage = payload?.usage;

  return <main className={`home-ai-control${embedded ? " embedded" : ""}`}>
    <header className="home-ai-control-head">
      <div><span>iBeX ADMIN · HOME AI CONTROL</span><h1>Home AI {t("удирдлага", "control")}</h1><p>{t("Нийтийн хэрэглэгчийн туслахын ажиллагаа, төсөв, хязгаар, нууцлал болон аудитыг нэг дор хянана.", "Control operation, budget, limits, privacy and audit for the public customer assistant.")}</p></div>
      <div className="home-ai-isolation"><strong>{t("ТУСГААРЛАСАН", "ISOLATED")}</strong><small>{t("Marketing AI болон iBeX Intelligent AI-д хандахгүй", "No access to Marketing AI or iBeX Intelligent AI")}</small></div>
    </header>
    {error ? <div className="home-ai-alert error" role="alert">{error}</div> : null}
    {message ? <div className="home-ai-alert success" role="status">{message}</div> : null}

    <section className="home-ai-status-grid">
      <article><small>OPENAI</small><strong className={status?.keyConfigured ? "ok" : "wait"}>{status?.keyConfigured ? t("Холбогдсон", "Connected") : t("Key хүлээж байна", "Waiting for key")}</strong><span>{t("Key-ийн утгыг энд харуулахгүй", "The key value is never displayed here")}</span></article>
      <article><small>{t("МЭДЛЭГ", "KNOWLEDGE")}</small><strong className={status?.approvedSources ? "ok" : "wait"}>{status?.approvedSources || 0}</strong><span>{t("Approved + Public эх сурвалж", "Approved + Public sources")}</span></article>
      <article><small>{t("ЭНЭ САР", "THIS MONTH")}</small><strong>{usage?.requests || 0}</strong><span>{t("AI хүсэлт", "AI requests")} · {usage?.activeSubjects || 0} {t("хэрэглэгч", "users")}</span></article>
      <article><small>{t("ТООЦООЛСОН ЗАРДАЛ", "ESTIMATED COST")}</small><strong>${(usage?.estimatedCostUsd || 0).toFixed(4)}</strong><span>{t("OpenAI Billing нь эцсийн дүн", "OpenAI Billing is authoritative")}</span></article>
    </section>

    <form className="home-ai-control-grid" onSubmit={save}>
      <section className="home-ai-panel">
        <div className="home-ai-panel-head"><div><span>01 · OPERATION</span><h2>{t("Ажиллагаа ба model", "Operation & models")}</h2></div><b className={`mode ${settings.mode}`}>{settings.mode}</b></div>
        <div className="home-ai-form-grid">
          <label>{t("Ажиллах горим", "Operating mode")}<select value={settings.mode} onChange={event => setSettings(current => ({ ...current, mode: event.target.value as HomeAiControlSettings["mode"] }))}><option value="disabled">Disabled</option><option value="test">Test</option><option value="production">Production</option></select></label>
          <label>{t("Хурдан model", "Fast model")}<input value={settings.fastModel} onChange={event => setSettings(current => ({ ...current, fastModel: event.target.value }))} /></label>
          <label>{t("Нарийвчилсан model", "Complex model")}<input value={settings.complexModel} onChange={event => setSettings(current => ({ ...current, complexModel: event.target.value }))} /></label>
          <label>{t("Хариултын max token", "Max output tokens")}<input type="number" min="120" max="2000" value={settings.maxOutputTokens} onChange={event => updateNumber("maxOutputTokens", event.target.value)} /></label>
        </div>
        <div className="home-ai-readiness">
          <span className={status?.keyConfigured ? "ready" : ""}>{t("Тусдаа OpenAI key", "Separate OpenAI key")}</span>
          <span className={status?.identitySaltConfigured ? "ready" : ""}>{t("Нууц identity salt", "Private identity salt")}</span>
          <span className={status?.approvedSources ? "ready" : ""}>{t("Баталгаажсан мэдлэг", "Approved knowledge")}</span>
        </div>
        <div className="home-ai-test-row"><button type="button" onClick={runTest} disabled={testing || !status?.readyForTest}>{testing ? t("Тестэлж байна…", "Testing…") : t("OpenAI холболт тестлэх", "Test OpenAI connection")}</button><small>{t("Test нь богино, төлбөртэй Responses API хүсэлт илгээнэ.", "The test sends one short, billable Responses API request.")}</small></div>
      </section>

      <section className="home-ai-panel">
        <div className="home-ai-panel-head"><div><span>02 · COST GUARD</span><h2>{t("Төсөв ба шударга хуваарилалт", "Budget & fair allocation")}</h2></div></div>
        <div className="home-ai-budget-track"><i style={{ width: `${budgetPercent}%` }} /><b style={{ left: `${Math.min(100, settings.warningBudgetUsd / settings.monthlyBudgetUsd * 100)}%` }}>5</b><b style={{ left: `${Math.min(100, settings.criticalBudgetUsd / settings.monthlyBudgetUsd * 100)}%` }}>8</b></div>
        <div className="home-ai-form-grid">
          <label>{t("Сарын app limit · USD", "Monthly app limit · USD")}<input type="number" min="1" step="0.5" value={settings.monthlyBudgetUsd} onChange={event => updateNumber("monthlyBudgetUsd", event.target.value)} /></label>
          <label>{t("Анхааруулга · USD", "Warning · USD")}<input type="number" min="0.01" step="0.5" value={settings.warningBudgetUsd} onChange={event => updateNumber("warningBudgetUsd", event.target.value)} /></label>
          <label>{t("Critical · USD", "Critical · USD")}<input type="number" min="0.01" step="0.5" value={settings.criticalBudgetUsd} onChange={event => updateNumber("criticalBudgetUsd", event.target.value)} /></label>
          <label>{t("Нэг хэрэглэгчийн доод хувь · USD", "Minimum user share · USD")}<input type="number" min="0.01" step="0.05" value={settings.minimumFairShareUsd} onChange={event => updateNumber("minimumFairShareUsd", event.target.value)} /></label>
          <label>{t("Нэг минутын хүсэлт", "Requests per minute")}<input type="number" min="1" max="120" value={settings.requestsPerMinute} onChange={event => updateNumber("requestsPerMinute", event.target.value)} /></label>
          <label>{t("Нэг хэрэглэгчийн өдрийн хүсэлт", "Daily requests per user")}<input type="number" min="1" max="10000" value={settings.requestsPerDay} onChange={event => updateNumber("requestsPerDay", event.target.value)} /></label>
        </div>
        <p className="home-ai-note">{t("Идэвхтэй хэрэглэгч олшрох тусам сарын app төсвийг автоматаар fair-share зарчмаар хуваана. OpenAI project-ийн $10 hard limit эцсийн хамгаалалт хэвээр байна.", "As active users increase, the app budget is allocated automatically using fair share. The OpenAI project's $10 hard limit remains the final safeguard.")}</p>
      </section>

      <section className="home-ai-panel privacy">
        <div className="home-ai-panel-head"><div><span>03 · PRIVACY</span><h2>{t("Нууцлал ба өгөгдлийн хил", "Privacy & data boundary")}</h2></div></div>
        <ul><li><b>✓</b>{t("Түүхий чат D1-д хадгалахгүй", "Raw chat is not stored in D1")}</li><li><b>✓</b>{t("OpenAI Responses API-д store: false", "OpenAI Responses API uses store: false")}</li><li><b>✓</b>{t("Зөвшөөрөлгүйгээр асуулт илгээхгүй", "No question is sent without consent")}</li><li><b>✓</b>{t("Зөвхөн сүүлийн 6 мессежийн түр context", "Only the latest 6 messages are temporary context")}</li><li><b>✓</b>{t("Имэйл, social, кампанит ажил гүйцэтгэхгүй", "No email, social or campaign execution")}</li></ul>
      </section>

      <section className="home-ai-panel audit">
        <div className="home-ai-panel-head"><div><span>04 · AUDIT</span><h2>{t("Сүүлийн үйл ажиллагаа", "Recent activity")}</h2></div><small>{usage?.month}</small></div>
        <div className="home-ai-audit-list">{payload?.audit.length ? payload.audit.map((row, index) => <div key={`${row.createdAt}-${index}`}><span><b>{row.status}</b>{row.eventType}</span><small>{row.model || "local"} · {new Date(row.createdAt).toLocaleString()}</small></div>) : <p>{t("Одоогоор audit event бүртгэгдээгүй.", "No audit events recorded yet.")}</p>}</div>
      </section>

      <footer className="home-ai-actions"><span>{t("Production горим зөвхөн key, identity salt, баталгаажсан мэдлэг бэлэн үед нээгдэнэ.", "Production is allowed only when the key, identity salt and approved knowledge are ready.")}</span><button type="submit" disabled={saving}>{saving ? t("Хадгалж байна…", "Saving…") : t("Тохиргоо хадгалах", "Save settings")}</button></footer>
    </form>
  </main>;
}
