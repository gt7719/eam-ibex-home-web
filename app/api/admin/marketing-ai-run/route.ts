import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { customerAiGuard, type CustomerAiDatabase } from "../../../lib/customer-ai";
import { MARKETING_AI_PROMPT_VERSION, marketingAiSettingsIsTested, marketingAiTokenBudget, readMarketingAiSettings, type MarketingAiPromptProfile } from "../../../lib/marketing-ai-control";
import { marketingAiOpenAiHttpError, marketingAiOpenAiMessage, normalizeMarketingAiOpenAiError, parseMarketingAiStructuredOutput, type MarketingAiOpenAiPayload } from "../../../lib/marketing-ai-openai";
import { inferMarketingAiProfile, marketingAiInstructions } from "../../../lib/marketing-ai-prompt";
import { marketingAiCostReservation, normalizeMarketingAiUsage } from "../../../lib/marketing-ai-usage";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasMarketingAdminPermission } from "../../../lib/site-admin";
import { readBoundedText } from "../../../lib/http-input";

export const dynamic = "force-dynamic";
type Runtime = { DB: CustomerAiDatabase; OPENAI_MARKETING_API_KEY?: string };
type DraftOutput = { title: string; draft: string; task_type: MarketingAiPromptProfile; requires_approval: boolean; missing_inputs: string[] };

async function subjectHash(adminId: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ibex-marketing-ai|${adminId}`));
  return Array.from(new Uint8Array(bytes), part => part.toString(16).padStart(2, "0")).join("");
}
function draftSchema() { return { type: "object", properties: { title: { type: "string" }, draft: { type: "string" }, task_type: { type: "string", enum: ["content", "campaign", "lead_followup", "report", "general"] }, requires_approval: { type: "boolean" }, missing_inputs: { type: "array", items: { type: "string" } } }, required: ["title", "draft", "task_type", "requires_approval", "missing_inputs"], additionalProperties: false }; }

async function reserveBudget(runtime: Runtime, input: { id: string; subject: string; month: string; amount: number; limit: number; now: Date }) {
  const createdAt = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + 90_000).toISOString();
  const results = await runtime.DB.batch([
    runtime.DB.prepare("UPDATE marketing_ai_budget_reservations SET status='released',updated_at=? WHERE status='pending' AND expires_at<=?")
      .bind(createdAt, createdAt),
    runtime.DB.prepare(`INSERT INTO marketing_ai_budget_reservations
      (id,subject_hash,month_key,amount_usd,status,expires_at,created_at,updated_at)
      SELECT ?,?,?,?,'pending',?,?,?
      WHERE COALESCE((SELECT SUM(estimated_cost_usd) FROM marketing_ai_monthly_usage WHERE month_key=?),0)
        + COALESCE((SELECT SUM(amount_usd) FROM marketing_ai_budget_reservations WHERE month_key=? AND status='pending' AND expires_at>?),0)
        + ? <= ?`)
      .bind(input.id, input.subject, input.month, input.amount, expiresAt, createdAt, createdAt, input.month, input.month, createdAt, input.amount, input.limit),
  ]);
  return Number(results[1]?.meta?.changes || 0) === 1;
}

async function callOpenAi(runtime: Runtime, input: { model: string; settings: Awaited<ReturnType<typeof readMarketingAiSettings>>["settings"]; profile: MarketingAiPromptProfile; lang: "mn" | "en"; command: string; subject: string; governedKnowledge: string; attempt?: number }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${runtime.OPENAI_MARKETING_API_KEY}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ model: input.model, store: false, max_output_tokens: marketingAiTokenBudget(input.settings, input.profile, input.attempt || 0), safety_identifier: input.subject,
      reasoning: { effort: input.settings.reasoningEffort }, instructions: marketingAiInstructions(input.settings, input.profile, input.lang, input.governedKnowledge), input: input.command,
      text: { verbosity: input.settings.verbosity, format: { type: "json_schema", name: "ibex_marketing_draft", strict: true, schema: draftSchema() } } }),
  });
  if (!response.ok) throw await marketingAiOpenAiHttpError(response);
  const payload = await response.json() as MarketingAiOpenAiPayload;
  return { payload, result: parseMarketingAiStructuredOutput<DraftOutput>(payload) };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasMarketingAdminPermission(user, "marketing.draft")) return NextResponse.json({ error: "Marketing AI Draft үүсгэх эрх олгогдоогүй байна." }, { status: 403 });
  const raw = await readBoundedText(request, 5_000);
  if (!raw.ok) return NextResponse.json({ error: raw.error }, { status: raw.status });
  let parsed: Record<string, unknown>; try { parsed = JSON.parse(raw.value || "{}"); } catch { return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 }); }
  if (Object.keys(parsed).some(key => !["command", "lang", "profile"].includes(key))) return NextResponse.json({ error: "Дэмжигдээгүй талбар байна." }, { status: 400 });
  const command = typeof parsed.command === "string" ? parsed.command.trim().slice(0, 1_200) : "", lang = parsed.lang === "en" ? "en" : "mn";
  if (command.length < 3) return NextResponse.json({ error: lang === "en" ? "Enter a marketing task." : "Маркетингийн даалгавар оруулна уу." }, { status: 400 });
  if (customerAiGuard(command) === "secret") return NextResponse.json({ error: lang === "en" ? "Remove passwords, API keys or other secrets before submitting." : "Нууц үг, API key болон бусад нууц мэдээллийг арилгаад дахин илгээнэ үү." }, { status: 400 });

  const runtime = env as unknown as Runtime, { settings } = await readMarketingAiSettings(runtime.DB);
  if (settings.mode === "disabled") return NextResponse.json({ error: lang === "en" ? "Marketing AI is disabled. Enable Test mode in AI settings." : "Marketing AI идэвхгүй байна. AI тохиргооноос Test горимыг асаана уу." }, { status: 409 });
  if (!runtime.OPENAI_MARKETING_API_KEY?.trim()) return NextResponse.json({ error: "OPENAI_MARKETING_API_KEY нууц тохиргоо оруулаагүй эсвэл deploy-д идэвхжээгүй байна." }, { status: 503 });
  if (settings.mode === "production" && !await marketingAiSettingsIsTested(settings)) return NextResponse.json({ error: "Production Draft тохиргоо өөрчлөгдсөн тул Test center-ээр дахин шалгана уу." }, { status: 409 });

  const now = new Date(), minute = now.toISOString().slice(0, 16), day = now.toISOString().slice(0, 10), month = day.slice(0, 7), subject = await subjectHash(user.id);
  let spent = 0;
  try {
    await runtime.DB.batch([
      runtime.DB.prepare("INSERT INTO marketing_ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'minute',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subject, minute, now.toISOString()),
      runtime.DB.prepare("INSERT INTO marketing_ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'day',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subject, day, now.toISOString()),
    ]);
    const [minuteUsage, dayUsage, budget] = await Promise.all([
      runtime.DB.prepare("SELECT request_count FROM marketing_ai_rate_limits WHERE subject_hash=? AND scope='minute' AND window_key=? LIMIT 1").bind(subject, minute).first<{ request_count: number }>(),
      runtime.DB.prepare("SELECT request_count FROM marketing_ai_rate_limits WHERE subject_hash=? AND scope='day' AND window_key=? LIMIT 1").bind(subject, day).first<{ request_count: number }>(),
      runtime.DB.prepare("SELECT COALESCE(SUM(estimated_cost_usd),0) AS spent FROM marketing_ai_monthly_usage WHERE month_key=?").bind(month).first<{ spent: number }>(),
    ]);
    spent = Number(budget?.spent || 0);
    if (Number(minuteUsage?.request_count || 0) > settings.requestsPerMinute || Number(dayUsage?.request_count || 0) > settings.requestsPerDay) return NextResponse.json({ error: lang === "en" ? "The Marketing AI fair-use limit is active." : "Marketing AI-ийн хэрэглээний хязгаар түр үйлчилж байна." }, { status: 429 });
    if (spent >= settings.monthlyBudgetUsd) return NextResponse.json({ error: lang === "en" ? "The monthly app budget is exhausted." : "Marketing AI-ийн сарын app төсөв дууссан байна." }, { status: 429 });
  } catch { return NextResponse.json({ error: lang === "en" ? "Marketing AI safety controls are unavailable." : "Marketing AI-ийн хамгаалалтын хяналт түр ажиллахгүй байна." }, { status: 503 }); }

  const knowledgeRows = await runtime.DB.prepare("SELECT title,kind,data_json FROM marketing_ai_records WHERE domain='knowledge' AND status='published' ORDER BY updated_at DESC LIMIT 12")
    .all<{ title: string; kind: string; data_json: string }>().catch(() => ({ results: [] as Array<{ title: string; kind: string; data_json: string }> }));
  const governedKnowledge = (knowledgeRows.results || []).map(row => { let data: Record<string, unknown> = {}; try { data = JSON.parse(row.data_json); } catch {} return `[${row.kind}] ${row.title}: ${String(data.body || "").slice(0, 1200)}${data.provenanceUrl ? ` (source: ${String(data.provenanceUrl).slice(0, 500)})` : ""}`; }).join("\n").slice(0, 10_000);
  const requestedProfile = ["general", "content", "campaign", "lead_followup", "report"].includes(String(parsed.profile)) ? parsed.profile as MarketingAiPromptProfile : settings.defaultPromptProfile;
  const profile = inferMarketingAiProfile(command, requestedProfile), detailed = profile === "campaign" || profile === "report";
  const criticalMode = spent >= settings.criticalBudgetUsd;
  const selectedModel = criticalMode ? settings.fastModel : detailed ? settings.detailedModel : settings.fastModel;
  let model = selectedModel, attempts = 0;
  const reservationId = crypto.randomUUID();
  const reservationAmount = marketingAiCostReservation(
    [selectedModel, settings.fallbackModel],
    command.length + governedKnowledge.length + settings.brandTone.length + settings.approvedClaims.length + settings.prohibitedClaims.length,
    marketingAiTokenBudget(settings, profile, settings.incompleteRetryLimit),
    settings.incompleteRetryLimit + 1,
  );
  try {
    const reserved = await reserveBudget(runtime, { id: reservationId, subject, month, amount: reservationAmount, limit: settings.monthlyBudgetUsd, now: new Date() });
    if (!reserved) return NextResponse.json({ error: lang === "en" ? "The monthly app budget is reserved or exhausted." : "Marketing AI-ийн сарын app төсөв бусад хүсэлтэд нөөцлөгдсөн эсвэл дууссан байна." }, { status: 429 });
  } catch (error) {
    console.error("marketing_ai_budget_reservation_failed", error);
    return NextResponse.json({ error: lang === "en" ? "Marketing AI budget controls are unavailable." : "Marketing AI-ийн төсвийн хамгаалалт түр ажиллахгүй байна." }, { status: 503 });
  }
  const failedAttemptUsage: Array<ReturnType<typeof normalizeMarketingAiUsage>> = [];
  let completedUsage: ReturnType<typeof normalizeMarketingAiUsage> | null = null;
  try {
    let completion;
    try {
      attempts += 1;
      completion = await callOpenAi(runtime, { model, settings, profile, lang, command, subject, governedKnowledge, attempt: 0 });
    }
    catch (error) {
      const problem = normalizeMarketingAiOpenAiError(error);
      if (problem.usage) failedAttemptUsage.push(normalizeMarketingAiUsage(model, { usage: problem.usage }));
      if (problem.code === "OUTPUT_INCOMPLETE" && settings.incompleteRetryLimit === 1) {
        attempts += 1;
        completion = await callOpenAi(runtime, { model, settings, profile, lang, command, subject, governedKnowledge, attempt: 1 });
      } else {
        if (!["OPENAI_TIMEOUT", "OPENAI_UNAVAILABLE"].includes(problem.code) || settings.fallbackModel === model || criticalMode) throw problem;
        model = settings.fallbackModel; attempts += 1;
        completion = await callOpenAi(runtime, { model, settings, profile, lang, command, subject, governedKnowledge, attempt: 0 });
      }
    }
    const { payload, result } = completion;
    if (!result.draft || result.requires_approval !== true) throw new Error("unsafe_or_empty_output");
    const successfulUsage = normalizeMarketingAiUsage(model, payload);
    const usage = [...failedAttemptUsage, successfulUsage].reduce((total, item) => ({ inputTokens: total.inputTokens + item.inputTokens, outputTokens: total.outputTokens + item.outputTokens,
      cachedInputTokens: total.cachedInputTokens + item.cachedInputTokens, reasoningTokens: total.reasoningTokens + item.reasoningTokens,
      estimatedCostUsd: Number((total.estimatedCostUsd + item.estimatedCostUsd).toFixed(6)), catalogVersion: item.catalogVersion }),
      { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, estimatedCostUsd: 0, catalogVersion: successfulUsage.catalogVersion });
    completedUsage = usage;
    const createdAt = new Date().toISOString(), draftId = crypto.randomUUID(), requestId = crypto.randomUUID();
    const missingInputs = Array.isArray(result.missing_inputs) ? result.missing_inputs.slice(0, 12).map(value => String(value).slice(0, 300)) : [];
    const persisted = await runtime.DB.batch([
      runtime.DB.prepare("UPDATE marketing_ai_budget_reservations SET status='settled',actual_cost_usd=?,updated_at=? WHERE id=? AND status='pending'")
        .bind(usage.estimatedCostUsd, createdAt, reservationId),
      runtime.DB.prepare("INSERT INTO marketing_ai_drafts (id,admin_id,title,task_type,prompt_profile,prompt_version,model,content,missing_inputs_json,status,revision,estimated_cost_usd,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,'draft',1,?,?,? WHERE changes()=1")
        .bind(draftId, user.id, String(result.title || "Marketing Draft").slice(0, 160), result.task_type || profile, profile, MARKETING_AI_PROMPT_VERSION, model, result.draft.slice(0, 12_000), JSON.stringify(missingInputs), usage.estimatedCostUsd, createdAt, createdAt),
      runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) SELECT ?,'draft',?,1,'created',?,?,NULL,? WHERE EXISTS (SELECT 1 FROM marketing_ai_drafts WHERE id=?)")
        .bind(crypto.randomUUID(), draftId, JSON.stringify({ title: String(result.title || "Marketing Draft").slice(0, 160), taskType: result.task_type || profile, promptProfile: profile, promptVersion: MARKETING_AI_PROMPT_VERSION, model, content: result.draft.slice(0, 12_000), missingInputs, status: "draft", revision: 1 }), user.id, createdAt, draftId),
      runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_drafts WHERE id=?)")
        .bind(crypto.randomUUID(), user.id, "marketing_ai.draft", model, "draft_created", JSON.stringify({ requestId, draftId, reservationId, reservationAmount, commandLength: command.length, taskType: result.task_type || profile, promptProfile: profile, promptVersion: MARKETING_AI_PROMPT_VERSION, publishedKnowledgeCount: (knowledgeRows.results || []).length, tokenBudget: marketingAiTokenBudget(settings, profile), attempts, criticalMode, usage, outboundExecuted: false, spendExecuted: false, humanApprovalRequired: true }), createdAt, draftId),
      runtime.DB.prepare("INSERT INTO marketing_ai_monthly_usage (subject_hash,month_key,request_count,input_tokens,output_tokens,estimated_cost_usd,updated_at) SELECT ?,?,1,?,?,?,? WHERE EXISTS (SELECT 1 FROM marketing_ai_drafts WHERE id=?) ON CONFLICT(subject_hash,month_key) DO UPDATE SET request_count=request_count+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,estimated_cost_usd=estimated_cost_usd+excluded.estimated_cost_usd,updated_at=excluded.updated_at")
        .bind(subject, month, usage.inputTokens, usage.outputTokens, usage.estimatedCostUsd, createdAt, draftId),
    ]);
    if (Number(persisted[0]?.meta?.changes || 0) !== 1) throw new Error("BUDGET_RESERVATION_EXPIRED");
    return NextResponse.json({ requestId, draftId, title: String(result.title || "Marketing Draft").slice(0, 160), draft: result.draft.slice(0, 12_000), taskType: result.task_type || profile, promptProfile: profile, promptVersion: MARKETING_AI_PROMPT_VERSION, missingInputs, requiresApproval: true, outboundExecuted: false, mode: settings.mode, model, attempts, criticalMode, usage, estimatedCostUsd: usage.estimatedCostUsd }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const problem = normalizeMarketingAiOpenAiError(error);
    if (problem.usage) failedAttemptUsage.push(normalizeMarketingAiUsage(model, { usage: problem.usage }));
    const failedUsage = completedUsage || failedAttemptUsage.reduce((total, item) => ({ inputTokens: total.inputTokens + item.inputTokens, outputTokens: total.outputTokens + item.outputTokens,
      cachedInputTokens: total.cachedInputTokens + item.cachedInputTokens, reasoningTokens: total.reasoningTokens + item.reasoningTokens,
      estimatedCostUsd: Number((total.estimatedCostUsd + item.estimatedCostUsd).toFixed(6)), catalogVersion: item.catalogVersion }),
      { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, estimatedCostUsd: 0, catalogVersion: "estimate-2026-09-v1" });
    console.error("marketing_ai_openai_failed", problem.code);
    const failedAt = new Date().toISOString();
    const operations = [
      runtime.DB.prepare("UPDATE marketing_ai_budget_reservations SET status='released',actual_cost_usd=?,updated_at=? WHERE id=? AND status='pending'")
        .bind(failedUsage.estimatedCostUsd, failedAt, reservationId),
      runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), user.id, "marketing_ai.draft", model, problem.code, JSON.stringify({ reservationId, reservationAmount, commandLength: command.length, promptProfile: profile, promptVersion: MARKETING_AI_PROMPT_VERSION, attempts, usage: failedUsage, outboundExecuted: false }), failedAt),
    ];
    if (failedUsage.inputTokens || failedUsage.outputTokens) operations.push(runtime.DB.prepare("INSERT INTO marketing_ai_monthly_usage (subject_hash,month_key,request_count,input_tokens,output_tokens,estimated_cost_usd,updated_at) VALUES (?,?,1,?,?,?,?) ON CONFLICT(subject_hash,month_key) DO UPDATE SET request_count=request_count+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,estimated_cost_usd=estimated_cost_usd+excluded.estimated_cost_usd,updated_at=excluded.updated_at")
      .bind(subject, month, failedUsage.inputTokens, failedUsage.outputTokens, failedUsage.estimatedCostUsd, failedAt));
    try {
      await runtime.DB.batch(operations);
    } catch (auditError) {
      console.error("marketing_ai_failure_audit_unavailable", auditError);
      return NextResponse.json({ error: lang === "en" ? "Marketing AI audit storage is unavailable." : "Marketing AI-ийн audit хадгалалт түр ажиллахгүй байна." }, { status: 503 });
    }
    return NextResponse.json({ error: marketingAiOpenAiMessage(problem.code, lang), code: problem.code }, { status: problem.httpStatus });
  }
}
