import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import { readKnowledge, type KnowledgeEntry } from "../../../lib/assistant-knowledge";
import bookKnowledge from "../../../lib/ibex-book-knowledge.json";
import {
  actionIds,
  AGENTIC_TENANT,
  AGENTIC_USER,
  BUDGET_CRITICAL_USD,
  BUDGET_WARNING_USD,
  currentMonthKey,
  estimatedCostUsd,
  MONTHLY_BUDGET_USD,
  requiresAdminApproval,
  retrieveApprovedKnowledge,
  runIbexEngineeringPlugin,
  runIndustrialAnalytics,
  scenarioIds,
  selectModel,
  type ActionId,
  type ScenarioId,
  type SiteLang,
} from "../../../lib/agentic-ai";

const allowedKeys = new Set(["question", "scenario", "action", "lang"]);
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function readSpend(monthKey: string) {
  const row = await env.DB.prepare("SELECT cost_usd FROM ai_monthly_usage WHERE tenant_id = ? AND month_key = ?")
    .bind(AGENTIC_TENANT, monthKey).first<{ cost_usd: number }>();
  return Number(row?.cost_usd || 0);
}

async function recordAudit(event: Record<string, unknown>, costUsd = 0, actorId = AGENTIC_USER) {
  const now = new Date().toISOString();
  const monthKey = currentMonthKey();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO ai_audit_events (id, tenant_id, user_id, event_type, model, tool, status, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), AGENTIC_TENANT, actorId, event.eventType, event.model || null, event.tool || null, event.status, JSON.stringify(event), now),
      env.DB.prepare("INSERT INTO ai_monthly_usage (tenant_id, month_key, request_count, cost_usd, updated_at) VALUES (?, ?, 1, ?, ?) ON CONFLICT(tenant_id, month_key) DO UPDATE SET request_count = request_count + 1, cost_usd = cost_usd + excluded.cost_usd, updated_at = excluded.updated_at")
        .bind(AGENTIC_TENANT, monthKey, costUsd, now),
    ]);
    return true;
  } catch (error) {
    console.error("agentic_audit_storage_unavailable", error instanceof Error ? error.message : "unknown");
    return false;
  }
}

async function requestSubject(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 160) || "unknown";
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${AGENTIC_TENANT}|${ip}|${agent}`));
  return Array.from(new Uint8Array(data), (part) => part.toString(16).padStart(2, "0")).join("");
}

async function enforceRequestLimit(request: Request, now = new Date()) {
  const subjectHash = await requestSubject(request);
  const minuteKey = now.toISOString().slice(0, 16);
  const dayKey = now.toISOString().slice(0, 10);
  const staleCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'minute',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subjectHash, minuteKey, now.toISOString()),
    env.DB.prepare("INSERT INTO ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'day',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subjectHash, dayKey, now.toISOString()),
    env.DB.prepare("DELETE FROM ai_rate_limits WHERE updated_at < ?").bind(staleCutoff),
  ]);
  const [minute, day] = await Promise.all([
    env.DB.prepare("SELECT request_count FROM ai_rate_limits WHERE subject_hash=? AND scope='minute' AND window_key=? LIMIT 1").bind(subjectHash, minuteKey).first<{ request_count: number }>(),
    env.DB.prepare("SELECT request_count FROM ai_rate_limits WHERE subject_hash=? AND scope='day' AND window_key=? LIMIT 1").bind(subjectHash, dayKey).first<{ request_count: number }>(),
  ]);
  return Number(minute?.request_count || 0) <= 8 && Number(day?.request_count || 0) <= 60;
}

function previewAnswer(lang: SiteLang, analytics: ReturnType<typeof runIndustrialAnalytics>, approvalRequired: boolean) {
  if (lang === "en") return `The demo signal is ${analytics.changePercent}% above its baseline (${analytics.latest} latest). The open-source analytics adapter marks the condition as ${analytics.severity}. iBeX engineering evidence must be reviewed before assigning a failure mode. ${approvalRequired ? "The proposed external action is queued for administrator approval; nothing was sent or changed." : "Create an engineer inspection proposal; no live work order or safety action is executed."}`;
  return `Demo дохио суурь түвшнээс ${analytics.changePercent}%-иар өссөн (сүүлийн утга ${analytics.latest}). Open-source аналитик адаптер нөхцөлийг “${analytics.severity}” гэж тэмдэглэлээ. Доголдлын төрлийг оноохоос өмнө iBeX инженерийн нотолгоог хянана. ${approvalRequired ? "Гадагш нөлөөлөх санал админы баталгаажуулалтын дараалалд орсон; имэйл илгээгээгүй, өгөгдөл өөрчлөөгүй." : "Инженерийн үзлэгийн санал үүсгэнэ; бодит ажлын захиалга болон safety үйлдлийг автоматаар гүйцэтгэхгүй."}`;
}

async function callOpenAI(apiKey: string, model: string, lang: SiteLang, question: string, context: unknown) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 420,
      instructions: `You are the user-facing iBeX maintenance assistant. Answer in ${lang === "en" ? "English" : "Mongolian"}. Use only the supplied approved evidence and analysis. Distinguish R&D simulation from implemented capability. Never claim an action ran.`,
      input: `${question}\n\nCONTROLLED CONTEXT:\n${JSON.stringify(context)}`,
    }),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  return payload.output_text || payload.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text || "";
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const runtime = env as unknown as { ENABLE_AGENTIC_SHADOW?: string; OPENAI_INTELLIGENT_API_KEY?: string };
  if (runtime.ENABLE_AGENTIC_SHADOW?.trim().toLowerCase() !== "true") return reply({ error: "Not found" }, 404);
  const admin = await getAdminSession();
  if (!admin) return reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401);
  if (!hasAdminPermission(admin, "knowledge.manage")) return reply({ error: "Intelligent AI shadow туршилтын эрх олгогдоогүй байна." }, 403);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return reply({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Invalid request" }, 400);
  }
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !allowedKeys.has(key))) return reply({ error: "Unsupported field" }, 400);
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 800) : "";
  const scenario = body.scenario as ScenarioId;
  const action = body.action as ActionId;
  const lang: SiteLang = body.lang === "en" ? "en" : "mn";
  if (question.length < 3 || !scenarioIds.has(scenario) || !actionIds.has(action)) return reply({ error: lang === "en" ? "Select a valid scenario and enter a question." : "Зөв сценар сонгож, асуултаа оруулна уу." }, 400);

  const monthKey = currentMonthKey();
  let spentBefore = 0;
  try {
    const allowed = await enforceRequestLimit(request);
    if (!allowed) return reply({ error: lang === "en" ? "Too many requests. Please wait before retrying." : "Хэт олон хүсэлт илэрлээ. Түр хүлээгээд дахин оролдоно уу." }, 429);
    spentBefore = await readSpend(monthKey);
  } catch (error) {
    console.error("agentic_budget_guard_unavailable", error instanceof Error ? error.message : "unknown");
    return reply({ error: lang === "en" ? "AI safety controls are temporarily unavailable." : "AI хамгаалалтын хяналт түр ажиллахгүй байна." }, 503);
  }
  const criticalRequest = scenario !== "complex";
  if (spentBefore >= MONTHLY_BUDGET_USD || (spentBefore >= BUDGET_CRITICAL_USD && !criticalRequest)) {
    await recordAudit({ eventType: "llm.request", status: "budget_blocked", model: selectModel(scenario), tool: null, scenario }, 0, admin.id);
    return reply({ error: lang === "en" ? "The monthly AI budget policy blocked this request." : "Сарын AI төсвийн бодлого энэ хүсэлтийг хориглолоо.", budget: { spentUsd: spentBefore, limitUsd: MONTHLY_BUDGET_USD } }, 429);
  }

  const analytics = runIndustrialAnalytics(scenario);
  const engineering = runIbexEngineeringPlugin(scenario);
  let managed: KnowledgeEntry[] = [];
  try {
    ({ entries: managed } = await readKnowledge());
  } catch (error) {
    console.error("agentic_managed_knowledge_unavailable", error instanceof Error ? error.message : "unknown");
  }
  const sources = retrieveApprovedKnowledge([...managed, ...(bookKnowledge as KnowledgeEntry[])], question, lang);
  const model = selectModel(scenario);
  const approvalRequired = requiresAdminApproval(action);
  const context = { tenant: AGENTIC_TENANT, asset: "PUMP-101 / M-101", analytics, engineering, sources, action, approvalRequired };
  const apiKey = runtime.OPENAI_INTELLIGENT_API_KEY;
  let answer = previewAnswer(lang, analytics, approvalRequired);
  let openaiStatus: "not_configured" | "completed" | "fallback_preview" = "not_configured";
  if (apiKey) {
    try {
      const generated = await callOpenAI(apiKey, model, lang, question, context);
      if (generated) { answer = generated; openaiStatus = "completed"; }
    } catch (error) {
      openaiStatus = "fallback_preview";
      console.error("agentic_openai_call_failed", error instanceof Error ? error.message : "unknown");
    }
  }
  const costUsd = openaiStatus === "completed" ? estimatedCostUsd(model, question.length + JSON.stringify(context).length, answer.length) : 0;
  const approvalId = approvalRequired ? crypto.randomUUID() : null;
  if (approvalId) {
    try {
      await env.DB.prepare("INSERT INTO ai_approvals (id, tenant_id, action_type, requested_by, status, reason, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)")
        .bind(approvalId, AGENTIC_TENANT, action, admin.id, question.slice(0, 400), new Date().toISOString()).run();
    } catch (error) {
      console.error("agentic_approval_storage_unavailable", error instanceof Error ? error.message : "unknown");
      return reply({ error: lang === "en" ? "The approval queue is temporarily unavailable." : "Баталгаажуулалтын дараалал түр ажиллахгүй байна." }, 503);
    }
  }
  const auditRecorded = await recordAudit({ eventType: "agentic.run", status: "completed", model, tool: "industrial_analytics,ibex_engineering,approved_rag", scenario, action, approvalRequired, openaiStatus }, costUsd, admin.id);
  if (!auditRecorded) return reply({ error: lang === "en" ? "AI audit storage is temporarily unavailable." : "AI audit хадгалалт түр ажиллахгүй байна." }, 503);
  const spentAfter = Number((spentBefore + costUsd).toFixed(6));
  return reply({
    mode: "shadow",
    tenant: AGENTIC_TENANT,
    asset: "PUMP-101 / Motor M-101",
    model,
    openaiStatus,
    answer,
    analytics,
    engineering,
    sources,
    action: { type: action, status: approvalRequired ? "pending_admin_approval" : "proposal_only", approvalRequired, approvalId, executed: false },
    controls: { schema: "validated", permission: "demo.engineer:read+propose", tenantIsolation: "server_owned", automaticSafetyAction: false },
    budget: { month: monthKey, spentUsd: spentAfter, limitUsd: MONTHLY_BUDGET_USD, warningUsd: BUDGET_WARNING_USD, criticalUsd: BUDGET_CRITICAL_USD, policy: spentAfter >= BUDGET_CRITICAL_USD ? "critical_only" : spentAfter >= BUDGET_WARNING_USD ? "warning" : "normal" },
    audit: { recorded: auditRecorded, llm: true, tools: true },
  });
}
