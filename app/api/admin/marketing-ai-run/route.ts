import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { customerAiGuard, type CustomerAiDatabase } from "../../../lib/customer-ai";
import { readMarketingAiSettings } from "../../../lib/marketing-ai-control";
import { hasTrustedOrigin } from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";

export const dynamic = "force-dynamic";

type Runtime = { DB: CustomerAiDatabase; OPENAI_MARKETING_API_KEY?: string };

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  return payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
}

async function subjectHash(adminId: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ibex-marketing-ai|${adminId}`));
  return Array.from(new Uint8Array(bytes), (part) => part.toString(16).padStart(2, "0")).join("");
}

function estimatedCost(inputTokens: number, outputTokens: number) {
  return Number(((inputTokens * .2 + outputTokens * 1.2) / 1_000_000).toFixed(6));
}

async function record(runtime: Runtime, input: { adminId: string; subject: string; model: string | null; status: string; commandLength: number; taskType: string; inputTokens?: number; outputTokens?: number; cost?: number }) {
  const now = new Date().toISOString(), month = now.slice(0, 7);
  await runtime.DB.batch([
    runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), input.adminId, "marketing_ai.draft", input.model, input.status, JSON.stringify({ commandLength: input.commandLength, taskType: input.taskType, outboundExecuted: false, humanApprovalRequired: true }), now),
    runtime.DB.prepare("INSERT INTO marketing_ai_monthly_usage (subject_hash,month_key,request_count,input_tokens,output_tokens,estimated_cost_usd,updated_at) VALUES (?,?,1,?,?,?,?) ON CONFLICT(subject_hash,month_key) DO UPDATE SET request_count=request_count+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,estimated_cost_usd=estimated_cost_usd+excluded.estimated_cost_usd,updated_at=excluded.updated_at")
      .bind(input.subject, month, input.inputTokens || 0, input.outputTokens || 0, input.cost || 0, now),
  ]);
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "marketing.manage")) return NextResponse.json({ error: "Marketing AI ашиглах эрх олгогдоогүй байна." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 5_000) return NextResponse.json({ error: "Хүсэлт хэт урт байна." }, { status: 413 });
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw || "{}"); } catch { return NextResponse.json({ error: "Хүсэлтийн формат буруу байна." }, { status: 400 }); }
  if (Object.keys(parsed).some((key) => key !== "command" && key !== "lang")) return NextResponse.json({ error: "Дэмжигдээгүй талбар байна." }, { status: 400 });
  const command = typeof parsed.command === "string" ? parsed.command.trim().slice(0, 1_200) : "";
  const lang = parsed.lang === "en" ? "en" : "mn";
  if (command.length < 3) return NextResponse.json({ error: lang === "en" ? "Enter a marketing task." : "Маркетингийн даалгавар оруулна уу." }, { status: 400 });
  if (customerAiGuard(command) === "secret") return NextResponse.json({ error: lang === "en" ? "Remove passwords, API keys or other secrets before submitting." : "Нууц үг, API key болон бусад нууц мэдээллийг арилгаад дахин илгээнэ үү." }, { status: 400 });

  const runtime = env as unknown as Runtime;
  const { settings } = await readMarketingAiSettings(runtime.DB);
  if (settings.mode === "disabled") return NextResponse.json({ error: lang === "en" ? "Marketing AI is disabled. Enable Test mode in Integrations & settings." : "Marketing AI идэвхгүй байна. Интеграц ба тохиргоо хэсгээс Test горимыг асаана уу." }, { status: 409 });
  if (!runtime.OPENAI_MARKETING_API_KEY?.trim()) return NextResponse.json({ error: "OPENAI_MARKETING_API_KEY нууц тохиргоо оруулаагүй байна." }, { status: 503 });

  const now = new Date(), minute = now.toISOString().slice(0, 16), day = now.toISOString().slice(0, 10), month = day.slice(0, 7);
  const subject = await subjectHash(user.id);
  try {
    await runtime.DB.batch([
      runtime.DB.prepare("INSERT INTO marketing_ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'minute',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subject, minute, now.toISOString()),
      runtime.DB.prepare("INSERT INTO marketing_ai_rate_limits (subject_hash,scope,window_key,request_count,updated_at) VALUES (?,'day',?,1,?) ON CONFLICT(subject_hash,scope,window_key) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at").bind(subject, day, now.toISOString()),
    ]);
    const [minuteUsage, dayUsage, spend] = await Promise.all([
      runtime.DB.prepare("SELECT request_count FROM marketing_ai_rate_limits WHERE subject_hash=? AND scope='minute' AND window_key=? LIMIT 1").bind(subject, minute).first<{ request_count: number }>(),
      runtime.DB.prepare("SELECT request_count FROM marketing_ai_rate_limits WHERE subject_hash=? AND scope='day' AND window_key=? LIMIT 1").bind(subject, day).first<{ request_count: number }>(),
      runtime.DB.prepare("SELECT COALESCE(SUM(estimated_cost_usd),0) AS spent FROM marketing_ai_monthly_usage WHERE month_key=?").bind(month).first<{ spent: number }>(),
    ]);
    if (Number(minuteUsage?.request_count || 0) > settings.requestsPerMinute || Number(dayUsage?.request_count || 0) > settings.requestsPerDay) return NextResponse.json({ error: lang === "en" ? "The Marketing AI fair-use limit is active. Try again later." : "Marketing AI-ийн хэрэглээний хязгаар түр үйлчилж байна. Дараа дахин оролдоно уу." }, { status: 429 });
    if (Number(spend?.spent || 0) >= settings.monthlyBudgetUsd) return NextResponse.json({ error: lang === "en" ? "The Marketing AI monthly app budget is exhausted." : "Marketing AI-ийн сарын app төсөв дууссан байна." }, { status: 429 });
  } catch (error) {
    console.error("marketing_ai_guard_unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: lang === "en" ? "Marketing AI safety controls are temporarily unavailable." : "Marketing AI-ийн хамгаалалтын хяналт түр ажиллахгүй байна." }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.OPENAI_MARKETING_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: settings.model,
        store: false,
        max_output_tokens: settings.maxOutputTokens,
        safety_identifier: subject,
        instructions: [
          "You are iBeX Marketing AI, an administrator-only marketing drafting assistant.",
          "You are separate from public iBeX Home AI and the industrial iBeX Intelligent AI.",
          "You have no access to customer records, tenant data, Home AI conversations, email, social accounts, passwords or credentials.",
          "Prepare analysis, plans or content drafts only. Never claim that a message, post, campaign, payment or database change was executed.",
          "Do not invent product capabilities, prices, customer facts, campaign metrics or implementation status. Use explicit placeholders when evidence is missing.",
          "Every outbound publication, send or spend requires a later human approval and a separately authorized channel.",
          `Reply in ${lang === "en" ? "English" : "Mongolian"}.`,
        ].join(" "),
        input: command,
        text: { format: { type: "json_schema", name: "ibex_marketing_draft", strict: true, schema: { type: "object", properties: { draft: { type: "string" }, task_type: { type: "string", enum: ["content", "campaign", "lead_followup", "report", "general"] }, requires_approval: { type: "boolean" }, missing_inputs: { type: "array", items: { type: "string" } } }, required: ["draft", "task_type", "requires_approval", "missing_inputs"], additionalProperties: false } } },
      }),
    });
    if (!response.ok) throw new Error(`openai_${response.status}`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const result = JSON.parse(outputText(payload)) as { draft?: string; task_type?: string; requires_approval?: boolean; missing_inputs?: string[] };
    if (!result.draft) throw new Error("openai_invalid_output");
    const inputTokens = Number(payload.usage?.input_tokens || 0), outputTokens = Number(payload.usage?.output_tokens || 0), cost = estimatedCost(inputTokens, outputTokens);
    await record(runtime, { adminId: user.id, subject, model: settings.model, status: "draft_created", commandLength: command.length, taskType: result.task_type || "general", inputTokens, outputTokens, cost });
    return NextResponse.json({ draft: result.draft.slice(0, 8_000), taskType: result.task_type || "general", missingInputs: Array.isArray(result.missing_inputs) ? result.missing_inputs.slice(0, 10) : [], requiresApproval: true, outboundExecuted: false, mode: settings.mode, model: settings.model, estimatedCostUsd: cost }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("marketing_ai_openai_failed", error instanceof Error ? error.message : "unknown");
    try { await record(runtime, { adminId: user.id, subject, model: settings.model, status: "failed", commandLength: command.length, taskType: "unknown" }); } catch {}
    return NextResponse.json({ error: lang === "en" ? "OpenAI could not prepare the draft. Check the Marketing project key, model access and billing." : "OpenAI Draft бэлтгэж чадсангүй. Marketing project key, model access болон billing-ээ шалгана уу." }, { status: 502 });
  }
}
