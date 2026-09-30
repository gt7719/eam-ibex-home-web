import { env } from "@/app/runtime/env";
import { NextResponse } from "next/server";
import { conflictMessage, hasTrustedOrigin } from "../../../lib/admin-security";
import { MARKETING_AI_SETTINGS_KEY, marketingAiSettingsFingerprint, marketingAiSettingsIsTested, normalizeMarketingAiSettings, readMarketingAiSettings } from "../../../lib/marketing-ai-control";
import { getAdminSession, hasMarketingAdminPermission } from "../../../lib/site-admin";
import type { CustomerAiDatabase } from "../../../lib/customer-ai";
import { readJsonObject } from "../../../lib/http-input";

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
  const [usage, reservations, auditResult, draftCounts, recordCounts, settingsHistory] = await Promise.all([
    runtime.DB.prepare("SELECT COALESCE(SUM(request_count),0) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd FROM marketing_ai_monthly_usage WHERE month_key=?").bind(month).first<{ requests: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number }>(),
    runtime.DB.prepare("SELECT COALESCE(SUM(amount_usd),0) AS reserved_usd,COUNT(*) AS active FROM marketing_ai_budget_reservations WHERE month_key=? AND status='pending' AND expires_at>?").bind(month, new Date().toISOString()).first<{ reserved_usd: number; active: number }>(),
    runtime.DB.prepare("SELECT event_type, model, status, metadata_json, created_at FROM marketing_ai_audit_events ORDER BY created_at DESC LIMIT 30").all<{ event_type: string; model: string | null; status: string; metadata_json: string; created_at: string }>(),
    runtime.DB.prepare("SELECT status, COUNT(*) AS total FROM marketing_ai_drafts GROUP BY status").all<{ status: string; total: number }>(),
    runtime.DB.prepare("SELECT domain,status,COUNT(*) AS total FROM marketing_ai_records GROUP BY domain,status").all<{ domain: string; status: string; total: number }>(),
    runtime.DB.prepare("SELECT revision,change_type,changed_by,created_at FROM marketing_ai_revisions WHERE entity_type='settings' AND entity_id=? ORDER BY revision DESC LIMIT 10").bind(MARKETING_AI_SETTINGS_KEY).all<{ revision: number; change_type: string; changed_by: string; created_at: string }>(),
  ]);
  const keyConfigured = Boolean(runtime.OPENAI_MARKETING_API_KEY?.trim()), tested = await marketingAiSettingsIsTested(settings);
  const spent = Number(usage?.estimated_cost_usd || 0);
  const budgetState = spent >= settings.monthlyBudgetUsd ? "exhausted" : spent >= settings.criticalBudgetUsd ? "critical" : spent >= settings.warningBudgetUsd ? "warning" : "normal";
  return reply({
    settings, revision,
    status: { keyConfigured, tested, testedAt: tested ? settings.testedAt : "", emailConnected: Boolean(runtime.MARKETING_EMAIL_OAUTH_TOKEN?.trim()), socialConnected: Boolean(runtime.MARKETING_SOCIAL_OAUTH_TOKEN?.trim()), draftReady: keyConfigured && settings.mode !== "disabled", productionReady: keyConfigured && tested, outboundReady: false, humanApprovalRequired: true, separateFromHomeAi: true, separateFromIntelligentAi: true, budgetState },
    usage: { month, requests: Number(usage?.requests || 0), inputTokens: Number(usage?.input_tokens || 0), outputTokens: Number(usage?.output_tokens || 0), estimatedCostUsd: spent, reservedUsd: Number(reservations?.reserved_usd || 0), activeReservations: Number(reservations?.active || 0), authoritativeBilling: "OpenAI Marketing project budget" },
    draftCounts: Object.fromEntries((draftCounts.results || []).map(row => [row.status, Number(row.total || 0)])),
    recordCounts: (recordCounts.results || []).reduce<Record<string, Record<string, number>>>((result, row) => { result[row.domain] ||= {}; result[row.domain][row.status] = Number(row.total || 0); return result; }, {}),
    settingsHistory: (settingsHistory.results || []).map(row => ({ revision: row.revision, changeType: row.change_type, changedBy: row.changed_by, createdAt: row.created_at })),
    audit: (auditResult.results || []).map(row => { let metadata: Record<string, unknown> = {}; try { metadata = JSON.parse(row.metadata_json); } catch {} return { eventType: row.event_type, model: row.model, status: row.status, metadata, createdAt: row.created_at }; }),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize(true); if (auth.error || !auth.user) return auth.error;
  const parsedBody = await readJsonObject<{ settings?: unknown; revision?: string | null }>(request, 64_000);
  if (!parsedBody.ok) return reply({ error: parsedBody.error }, parsedBody.status);
  const raw = parsedBody.value;
  const runtime = env as unknown as Runtime;
  const current = await readMarketingAiSettings(runtime.DB), settings = normalizeMarketingAiSettings(raw.settings);
  if (current.revision !== (raw.revision ?? null)) return reply({ error: conflictMessage() }, 409);
  const currentFingerprint = await marketingAiSettingsFingerprint(current.settings), nextFingerprint = await marketingAiSettingsFingerprint(settings);
  if (current.settings.testedFingerprint !== currentFingerprint || currentFingerprint !== nextFingerprint) {
    settings.testedAt = ""; settings.testedFingerprint = ""; settings.testedBy = "";
  } else {
    settings.testedAt = current.settings.testedAt; settings.testedFingerprint = current.settings.testedFingerprint; settings.testedBy = current.settings.testedBy;
  }
  if (settings.mode === "production" && !runtime.OPENAI_MARKETING_API_KEY?.trim()) return reply({ error: "Production Draft горимын өмнө OPENAI_MARKETING_API_KEY холбоно уу." }, 409);
  if (settings.mode === "production" && !await marketingAiSettingsIsTested(settings)) return reply({ error: "Production Draft горимын өмнө одоогийн model, prompt болон хамгаалалтын тохиргоог Test center-ээр амжилттай шалгана уу." }, 409);
  const now = new Date().toISOString();
  const latestRevision = await runtime.DB.prepare("SELECT COALESCE(MAX(revision),0) AS revision FROM marketing_ai_revisions WHERE entity_type='settings' AND entity_id=?")
    .bind(MARKETING_AI_SETTINGS_KEY).first<{ revision: number }>();
  const valueJson = JSON.stringify(settings);
  const write = current.revision === null
    ? runtime.DB.prepare("INSERT INTO site_content (key,value_json,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING")
      .bind(MARKETING_AI_SETTINGS_KEY, valueJson, auth.user.id, now)
    : runtime.DB.prepare("UPDATE site_content SET value_json=?,updated_by=?,updated_at=? WHERE key=? AND updated_at=?")
      .bind(valueJson, auth.user.id, now, MARKETING_AI_SETTINGS_KEY, raw.revision ?? null);
  try {
    const results = await runtime.DB.batch([
      write,
      runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) SELECT ?,'settings',?,?,'updated',?,?,NULL,? WHERE changes()=1")
        .bind(crypto.randomUUID(), MARKETING_AI_SETTINGS_KEY, Number(latestRevision?.revision || 0) + 1, valueJson, auth.user.id, now),
      runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1")
        .bind(crypto.randomUUID(), auth.user.id, "marketing_ai.settings_changed", null, "completed", JSON.stringify({ mode: settings.mode, tested: await marketingAiSettingsIsTested(settings), tokenPolicy: settings.tokenPolicy, outboundEnabled: false }), now),
    ]);
    if (Number(results[0]?.meta?.changes || 0) !== 1) return reply({ error: conflictMessage() }, 409);
  } catch (error) {
    console.error("marketing_ai_settings_atomic_write_failed", error);
    return reply({ error: "Тохиргоо, revision болон audit-ийг хамтад нь хадгалж чадсангүй." }, 503);
  }
  return reply({ saved: true, settings, revision: now });
}
