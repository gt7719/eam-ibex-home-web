"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "../../lib/use-site-language";
import type { HomeAiControlSettings } from "../../lib/home-ai-control";
import "./style.css";

type Payload = {
  settings: HomeAiControlSettings;
  revision: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  status: {
    keyConfigured: boolean;
    promptConfigured: boolean;
    promptStatus: "ready" | "missing";
    identitySaltConfigured: boolean;
    approvedSources: number;
    readyForTest: boolean;
    knowledgeMode: "open";
    rawChatStored: true;
    historyMessages: number;
    historyRetentionDays: number;
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
  audit: Array<{ eventType: string; model: string | null; status: string; detail?: string; createdAt: string }>;
};

const emptySettings: HomeAiControlSettings = {
  mode: "test", fastModel: "gpt-5.6-luna", complexModel: "gpt-5.6-terra",
  monthlyBudgetUsd: 10, warningBudgetUsd: 5, criticalBudgetUsd: 8,
  minimumFairShareUsd: .25, requestsPerMinute: 6, requestsPerDay: 10, maxOutputTokens: 520,
  publishedPromptId: "", historyRetentionDays: 90,
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

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
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
      <article><small>{t("МЭДЛЭГИЙН ГОРИМ", "KNOWLEDGE MODE")}</small><strong className="ok">{t("НЭЭЛТТЭЙ", "OPEN")}</strong><span>{t("OpenAI-ийн ерөнхий мэдлэг ашиглана", "Uses OpenAI general knowledge")}</span></article>
      <article><small>{t("iBeX ЛАВЛАГАА", "iBeX REFERENCES")}</small><strong className={status?.approvedSources ? "ok" : "wait"}>{status?.approvedSources || 0}</strong><span>{t("Нэмэлт эх сурвалж · заавал биш", "Optional supplementary sources")}</span></article>
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
          <span className="ready">{t("Нээлттэй ерөнхий мэдлэг", "Open general knowledge")}</span>
          <span className={status?.approvedSources ? "ready" : ""}>{t("Нэмэлт iBeX лавлагаа", "Optional iBeX references")}</span>
        </div>
        <div className="home-ai-test-row"><button type="button" onClick={runTest} disabled={testing || !status?.readyForTest}>{testing ? t("Тестэлж байна…", "Testing…") : t("OpenAI холболт тестлэх", "Test OpenAI connection")}</button><small>{t("Production Home AI-тай ижил code-managed prompt болон server API key-г ашиглан богино Responses API тест хийнэ.", "Runs one short Responses API test using the same code-managed prompt as production Home AI and the server API key.")}</small></div>
        {payload?.updatedAt ? <p className="home-ai-note">{t("Сүүлд өөрчилсөн", "Last changed")}: {new Date(payload.updatedAt).toLocaleString()} · {payload.updatedBy || "—"}</p> : null}
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
        <div className="home-ai-form-grid"><label className="wide">{t("Ярианы түүх хадгалах хоног", "Conversation retention days")}<input type="number" min="1" max="365" value={settings.historyRetentionDays} onChange={event => updateNumber("historyRetentionDays", event.target.value)} /><small>{t("Хугацаа дууссан түүх автоматаар цэвэрлэгдэнэ.", "Expired conversation history is removed automatically.")}</small></label></div>
        <ul><li><b>✓</b>{t(`Нэвтэрсэн хэрэглэгчийн яриа D1-д ${settings.historyRetentionDays} хүртэл хоног хадгалагдана`, `Signed-in conversation history is stored in D1 for up to ${settings.historyRetentionDays} days`)}</li><li><b>✓</b>{t("OpenAI Responses API-д store: false", "OpenAI Responses API uses store: false")}</li><li><b>✓</b>{t("Privacy v2 зөвшөөрөлгүйгээр шинэ асуулт илгээхгүй", "No new question is sent without Privacy v2 consent")}</li><li><b>✓</b>{t("Хариулт боловсруулахдаа зөвхөн сүүлийн 6 мессеж ашиглана", "Only the latest 6 messages are used to prepare a response")}</li><li><b>✓</b>{t("Имэйл, social, кампанит ажил гүйцэтгэхгүй", "No email, social or campaign execution")}</li></ul>
      </section>

      <section className="home-ai-panel audit">
        <div className="home-ai-panel-head"><div><span>04 · AUDIT</span><h2>{t("Сүүлийн үйл ажиллагаа", "Recent activity")}</h2></div><small>{usage?.month}</small></div>
        <div className="home-ai-audit-list">{payload?.audit.length ? payload.audit.map((row, index) => <div key={`${row.createdAt}-${index}`}><span><b>{row.status}</b>{row.eventType}{row.detail ? <em>{row.detail}</em> : null}</span><small>{row.model || "local"} · {new Date(row.createdAt).toLocaleString()}</small></div>) : <p>{t("Одоогоор audit event бүртгэгдээгүй.", "No audit events recorded yet.")}</p>}</div>
      </section>

      <footer className="home-ai-actions"><span>{t("Production горимд server API key болон identity salt шаардлагатай. iBeX лавлагаа нь нэмэлт бөгөөд хариултыг хязгаарлахгүй.", "Production requires the server API key and identity salt. iBeX references are supplementary and do not restrict answers.")}</span><button type="submit" disabled={saving}>{saving ? t("Хадгалж байна…", "Saving…") : t("Тохиргоо хадгалах", "Save settings")}</button></footer>
    </form>
  </main>;
}
