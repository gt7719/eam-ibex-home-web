import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { conflictMessage, hasTrustedOrigin, saveContentWithRevision } from "../../../lib/admin-security";
import { MARKETING_AI_SETTINGS_KEY, marketingAiSettingsFingerprint, marketingAiSettingsIsTested, normalizeMarketingAiSettings, readMarketingAiSettings } from "../../../lib/marketing-ai-control";
import { getAdminSession, hasMarketingAdminPermission } from "../../../lib/site-admin";
import type { CustomerAiDatabase } from "../../../lib/customer-ai";

export const dynamic = "force-dynamic";
type Runtime = { DB: CustomerAiDatabase; OPENAI_MARKETING_API_KEY?: string; MARKETING_EMAIL_OAUTH_TOKEN?: string; MARKETING_SOCIAL_OAUTH_TOKEN?: string };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function authorize(settingsOnly = false) {
  const user = await getAdminSession();
  if (!user) return { error: reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401), user: null };
  if (!hasMarketingAdminPermission(user, settingsOnly ? "marketing.settings" : undefined)) return { error: reply({ error: "Marketing AI удирдах эрх олгогдоогүй байна." }, 403), user: null };
  return { error: null, user };
}

export async function GET() {
  const auth = await authorize(); if (auth.error) return auth.error;
  const runtime = env as unknown as Runtime, month = new Date().toISOString().slice(0, 7);
  const { settings, revision } = await readMarketingAiSettings(runtime.DB);
  const [usage, auditResult, draftCounts] = await Promise.all([
    runtime.DB.prepare("SELECT COALESCE(SUM(request_count),0) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd FROM marketing_ai_monthly_usage WHERE month_key=?").bind(month).first<{ requests: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number }>(),
    runtime.DB.prepare("SELECT event_type, model, status, metadata_json, created_at FROM marketing_ai_audit_events ORDER BY created_at DESC LIMIT 30").all<{ event_type: string; model: string | null; status: string; metadata_json: string; created_at: string }>(),
    runtime.DB.prepare("SELECT status, COUNT(*) AS total FROM marketing_ai_drafts GROUP BY status").all<{ status: string; total: number }>(),
  ]);
  const keyConfigured = Boolean(runtime.OPENAI_MARKETING_API_KEY?.trim()), tested = await marketingAiSettingsIsTested(settings);
  const spent = Number(usage?.estimated_cost_usd || 0);
  const budgetState = spent >= settings.monthlyBudgetUsd ? "exhausted" : spent >= settings.criticalBudgetUsd ? "critical" : spent >= settings.warningBudgetUsd ? "warning" : "normal";
  return reply({
    settings, revision,
    status: { keyConfigured, tested, testedAt: tested ? settings.testedAt : "", emailConnected: Boolean(runtime.MARKETING_EMAIL_OAUTH_TOKEN?.trim()), socialConnected: Boolean(runtime.MARKETING_SOCIAL_OAUTH_TOKEN?.trim()), draftReady: keyConfigured && settings.mode !== "disabled", productionReady: keyConfigured && tested, outboundReady: false, humanApprovalRequired: true, separateFromHomeAi: true, separateFromIntelligentAi: true, budgetState },
    usage: { month, requests: Number(usage?.requests || 0), inputTokens: Number(usage?.input_tokens || 0), outputTokens: Number(usage?.output_tokens || 0), estimatedCostUsd: spent, authoritativeBilling: "OpenAI Marketing project budget" },
    draftCounts: Object.fromEntries((draftCounts.results || []).map(row => [row.status, Number(row.total || 0)])),
    audit: (auditResult.results || []).map(row => ({ eventType: row.event_type, model: row.model, status: row.status, createdAt: row.created_at })),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize(true); if (auth.error || !auth.user) return auth.error;
  const raw = await request.json().catch(() => null) as { settings?: unknown; revision?: string | null } | null;
  if (!raw) return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  const runtime = env as unknown as Runtime;
  const current = await readMarketingAiSettings(runtime.DB), settings = normalizeMarketingAiSettings(raw.settings);
  const currentFingerprint = await marketingAiSettingsFingerprint(current.settings), nextFingerprint = await marketingAiSettingsFingerprint(settings);
  if (current.settings.testedFingerprint !== currentFingerprint || currentFingerprint !== nextFingerprint) {
    settings.testedAt = ""; settings.testedFingerprint = ""; settings.testedBy = "";
  } else {
    settings.testedAt = current.settings.testedAt; settings.testedFingerprint = current.settings.testedFingerprint; settings.testedBy = current.settings.testedBy;
  }
  if (settings.mode === "production" && !runtime.OPENAI_MARKETING_API_KEY?.trim()) return reply({ error: "Production Draft горимын өмнө OPENAI_MARKETING_API_KEY холбоно уу." }, 409);
  if (settings.mode === "production" && !await marketingAiSettingsIsTested(settings)) return reply({ error: "Production Draft горимын өмнө одоогийн model, prompt болон хамгаалалтын тохиргоог Test center-ээр амжилттай шалгана уу." }, 409);
  const revision = await saveContentWithRevision({ key: MARKETING_AI_SETTINGS_KEY, value: settings, userId: auth.user.id, expectedRevision: raw.revision ?? null });
  if (!revision) return reply({ error: conflictMessage() }, 409);
  await runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), auth.user.id, "marketing_ai.settings_changed", null, "completed", JSON.stringify({ mode: settings.mode, tested: await marketingAiSettingsIsTested(settings), outboundEnabled: false }), new Date().toISOString()).run();
  return reply({ saved: true, settings, revision });
}
