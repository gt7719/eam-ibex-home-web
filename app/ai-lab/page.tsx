"use client";

import { useState } from "react";
import Link from "next/link";
import { useSiteLanguage } from "../lib/use-site-language";
import "./style.css";

type Result = {
  mode: string; tenant: string; asset: string; model: string; openaiStatus: string; answer: string;
  analytics: { engine: string; status: string; method: string; signal: string; latest: number; changePercent: number; severity: string; confidence: number };
  engineering: { pluginId: string; owner: string; status: string; finding: string; protectedMethod: boolean };
  sources: Array<{ id: string; title: string; label: string; version: string }>;
  action: { type: string; status: string; approvalRequired: boolean; executed: boolean };
  controls: { schema: string; permission: string; tenantIsolation: string; automaticSafetyAction: boolean };
  budget: { month: string; spentUsd: number; limitUsd: number; warningUsd: number; criticalUsd: number; policy: string };
  audit: { recorded: boolean; llm: boolean; tools: boolean };
};

const initial: Result = {
  mode: "shadow", tenant: "DEMO-TENANT", asset: "PUMP-101 / Motor M-101", model: "gpt-5.6-luna", openaiStatus: "not_configured",
  answer: "Demo дохио суурь түвшнээс 114.9%-иар өссөн. Open-source аналитик хэвийн бус тренд илрүүлсэн бөгөөд iBeX инженерийн AI нотолгоог хянах шаардлагатай. Инженерийн үзлэгийн санал бэлтгэсэн; бодит системд үйлдэл хийгдээгүй.",
  analytics: { engine: "Open-source analytics adapter", status: "simulated_rnd", method: "rolling baseline + robust trend rule", signal: "bearing_vibration_mm_s", latest: 4.8, changePercent: 114.9, severity: "high", confidence: .84 },
  engineering: { pluginId: "ibex.shaft-bearing.demo.v1", owner: "iBeX Engineering", status: "rnd_validation", finding: "Bearing/shaft signature requires engineer review before a failure mode is assigned.", protectedMethod: true },
  sources: [{ id: "kb-ai-status", title: "iBeX AI хөгжүүлэлтийн төлөв", label: "Approved iBeX knowledge", version: "1.0" }],
  action: { type: "inspect", status: "proposal_only", approvalRequired: false, executed: false },
  controls: { schema: "validated", permission: "demo.engineer:read+propose", tenantIsolation: "server_owned", automaticSafetyAction: false },
  budget: { month: "DEMO", spentUsd: 0, limitUsd: 20, warningUsd: 14, criticalUsd: 18, policy: "normal" },
  audit: { recorded: true, llm: true, tools: true },
};

export default function AgenticAiLab() {
  const { lang, t } = useSiteLanguage();
  const [question, setQuestion] = useState("PUMP-101 моторын холхивчийн чичиргээ огцом өссөнийг шинжилж, дараагийн алхмыг санал болго.");
  const [scenario, setScenario] = useState("bearing");
  const [action, setAction] = useState("inspect");
  const [result, setResult] = useState<Result>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/agentic/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, scenario, action, lang }) });
      const raw = await response.text();
      const data = (raw ? JSON.parse(raw) : { error: t("API хариу хоосон байна.", "The API returned an empty response.") }) as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed"); }
    finally { setBusy(false); }
  }

  const pct = Math.min(100, result.budget.spentUsd / result.budget.limitUsd * 100);
  return <main className="ai-lab-shell">
    <header className="ai-lab-topbar">
      <Link className="ai-brand" href="/" aria-label="iBeX home"><span>iBe<span>X</span></span></Link>
      <div className="ai-mode"><i/> {t("DEMO / SHADOW MODE", "DEMO / SHADOW MODE")}</div>
      <Link className="ai-back" href="/">← {t("Нүүр хуудас", "Home")}</Link>
    </header>
    <section className="ai-lab-hero">
      <div><span className="ai-eyebrow">iBeX HYBRID INTELLIGENCE · PHASE 1</span><h1>{t("Инженерийн шийдвэрийг дэмжих Agentic AI", "Agentic AI for engineering decisions")}</h1><p>{t("Open-source аналитик, iBeX инженерийн AI болон OpenAI-ийн тайлбарыг нэг нотолгоонд суурилсан урсгалд нэгтгэнэ.", "Combines open-source analytics, iBeX engineering AI and OpenAI explanation in one evidence-grounded flow.")}</p></div>
      <div className="ai-boundary"><strong>{t("Холболтын төлөв", "Connection status")}</strong><span>{t("Үндсэн iBeX-д холбоогүй", "Not connected to core iBeX")}</span><small>{t("Demo өгөгдөл · ямар ч бодит үйлдэлгүй", "Demo data · no live actions")}</small></div>
    </section>

    <section className="ai-pipeline" aria-label="Hybrid AI pipeline">
      {[["01","Industrial data",t("Demo sensor", "Demo sensor")],["02","Open-source AI",t("Аномали ба тренд", "Anomaly & trend")],["03","iBeX Engineer AI",t("Хамгаалагдсан plugin", "Protected plug-in")],["04","Approved RAG",t("Зөвхөн iBeX эх сурвалж", "iBeX sources only")],["05","OpenAI",result.model]].map((step, index)=><div className="ai-pipe-step" key={step[0]}><small>{step[0]}</small><strong>{step[1]}</strong><span>{step[2]}</span>{index<4&&<b>→</b>}</div>)}
    </section>

    <div className="ai-workspace">
      <section className="ai-query-card">
        <div className="ai-card-title"><div><span>{t("ХЯНАЛТТАЙ ХҮСЭЛТ", "CONTROLLED REQUEST")}</span><h2>{t("Шинжилгээ ажиллуулах", "Run an analysis")}</h2></div><em>{result.tenant}</em></div>
        <label>{t("Сценар", "Scenario")}<select value={scenario} onChange={e=>setScenario(e.target.value)}><option value="bearing">{t("Холхивчийн чичиргээ", "Bearing vibration")}</option><option value="thermal">{t("Температур ба ачаалал", "Temperature & load")}</option><option value="complex">{t("Нийлмэл хүсэлт · Terra fallback", "Complex request · Terra fallback")}</option></select></label>
        <label>{t("Санал болгох үйлдэл", "Proposed action")}<select value={action} onChange={e=>setAction(e.target.value)}><option value="inspect">{t("Инженерийн үзлэг", "Engineer inspection")}</option><option value="email_team">{t("Багт имэйл — админ батална", "Email team — admin approval")}</option><option value="bulk_schedule">{t("Олон ажлын хуваарь — админ батална", "Bulk schedule — admin approval")}</option></select></label>
        <label>{t("Инженерийн асуулт", "Engineering question")}<textarea value={question} maxLength={800} onChange={e=>setQuestion(e.target.value)}/></label>
        {error&&<p className="ai-error">{error}</p>}
        <button className="ai-run" onClick={run} disabled={busy}>{busy?t("Шинжилж байна…", "Analyzing…"):t("Hybrid AI шинжилгээ ажиллуулах", "Run hybrid AI analysis")} <span>↗</span></button>
        <p className="ai-safety">◉ {t("Tenant ID, SQL, URL болон дурын tool хүсэлт клиентээс хүлээн авахгүй.", "Tenant ID, SQL, URLs and arbitrary tools are never accepted from the client.")}</p>
      </section>

      <section className="ai-result-card">
        <div className="ai-result-head"><div><span>{t("ХЭРЭГЛЭГЧИД ӨГӨХ ТАЙЛБАР", "USER-FACING EXPLANATION")}</span><h2>{result.asset}</h2></div><div className="ai-model"><small>{result.openaiStatus==="completed"?"LIVE":"PREVIEW"}</small>{result.model}</div></div>
        <p className="ai-answer">{lang==="en"&&result===initial?"The demo signal is above baseline. Open-source analytics detected an abnormal trend and iBeX engineering evidence requires review. An inspection proposal is prepared; no live system action was taken.":result.answer}</p>
        <div className="ai-evidence-grid">
          <article><span>{t("OPEN-SOURCE ANALYTICS", "OPEN-SOURCE ANALYTICS")}</span><strong>+{result.analytics.changePercent}%</strong><p>{result.analytics.signal} · {result.analytics.severity}</p><small>{Math.round(result.analytics.confidence*100)}% confidence · {result.analytics.status}</small></article>
          <article><span>iBeX ENGINEER AI</span><strong>{t("Plugin бэлэн", "Plug-in ready")}</strong><p>{result.engineering.pluginId}</p><small>{result.engineering.status} · {t("арга хамгаалагдсан", "protected method")}</small></article>
        </div>
        <div className="ai-action-row"><div><span>{t("САНАЛ БОЛГОСОН ҮЙЛДЭЛ", "PROPOSED ACTION")}</span><strong>{result.action.status.replaceAll("_"," ")}</strong></div><div className={result.action.approvalRequired?"needs-approval":"safe-proposal"}>{result.action.approvalRequired?t("Админ батална", "Admin approval"):t("Зөвхөн санал", "Proposal only")}</div></div>
      </section>
    </div>

    <section className="ai-bottom-grid">
      <article className="ai-budget"><div className="ai-card-title"><div><span>OPENAI API BUDGET</span><h2>${result.budget.spentUsd.toFixed(4)} / ${result.budget.limitUsd}</h2></div><em>{result.budget.policy}</em></div><div className="ai-budget-track"><i style={{width:`${pct}%`}}/><b style={{left:"70%"}}>70%</b><b style={{left:"90%"}}>90%</b></div><div className="ai-budget-labels"><span>${result.budget.warningUsd} {t("анхааруулга", "warning")}</span><span>${result.budget.criticalUsd} {t("чухал хүсэлт", "critical only")}</span><span>${result.budget.limitUsd} {t("зогсооно", "hard stop")}</span></div></article>
      <article className="ai-governance"><div className="ai-card-title"><div><span>GOVERNANCE</span><h2>{t("Хяналтын төлөв", "Control status")}</h2></div><em>5 / 5</em></div><ul><li><i/>Schema validated</li><li><i/>Permission ≤ requesting user</li><li><i/>Tenant server-owned</li><li><i/>Approved iBeX RAG only</li><li><i/>LLM + tool audit enabled</li></ul></article>
      <article className="ai-sources"><div className="ai-card-title"><div><span>RAG EVIDENCE</span><h2>{t("Баталгаажсан эх сурвалж", "Approved sources")}</h2></div><em>{result.sources.length}</em></div>{result.sources.length?result.sources.map(source=><div className="ai-source" key={source.id}><strong>{source.title}</strong><span>{source.label} · v{source.version}</span></div>):<p>{t("Тохирох баталгаажсан эх сурвалж олдсонгүй.", "No matching approved source found.")}</p>}</article>
    </section>
    <footer className="ai-lab-footer"><span>{t("45-р хувилбарын суурь · дараагийн хувилбарын Agentic AI Lab", "v45 baseline · next-version Agentic AI Lab")}</span><span>{t("GPU болон open-source сервер ашиглаагүй", "No GPU or open-source server in Phase 1")}</span></footer>
  </main>;
}
