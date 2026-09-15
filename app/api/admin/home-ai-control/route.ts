import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { readKnowledge } from "../../../lib/assistant-knowledge";
import { type CustomerAiDatabase } from "../../../lib/customer-ai";
import {
  HOME_AI_SETTINGS_KEY,
  normalizeHomeAiSettings,
  readHomeAiSettings,
} from "../../../lib/home-ai-control";
import { conflictMessage, hasTrustedOrigin, saveContentWithRevision } from "../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";

export const dynamic = "force-dynamic";

type HomeAiRuntime = {
  DB: CustomerAiDatabase;
  OPENAI_HOME_API_KEY?: string;
  HOME_AI_ID_HASH_SALT?: string;
};

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorize() {
  const user = await getAdminSession();
  if (!user) return { error: reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401), user: null };
  if (!hasAdminPermission(user, "knowledge.manage")) return { error: reply({ error: "Home AI удирдах эрх олгогдоогүй байна." }, 403), user: null };
  return { error: null, user };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const runtime = env as unknown as HomeAiRuntime;
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const { settings, revision } = await readHomeAiSettings(runtime.DB);
  const [usage, auditResult, knowledge] = await Promise.all([
    runtime.DB.prepare(
      "SELECT COALESCE(SUM(request_count),0) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd, COUNT(*) AS active_subjects FROM customer_ai_monthly_usage WHERE month_key=?",
    ).bind(month).first<{ requests: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number; active_subjects: number }>(),
    runtime.DB.prepare(
      "SELECT event_type, model, status, metadata_json, created_at FROM customer_ai_audit_events WHERE channel='ibex-home' ORDER BY created_at DESC LIMIT 12",
    ).all<{ event_type: string; model: string | null; status: string; metadata_json: string; created_at: string }>(),
    readKnowledge(),
  ]);
  const approvedSources = knowledge.entries.filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public").length;
  const recentAudit = auditResult.results || [];
  return reply({
    settings,
    revision,
    status: {
      keyConfigured: Boolean(runtime.OPENAI_HOME_API_KEY?.trim()),
      identitySaltConfigured: Boolean(runtime.HOME_AI_ID_HASH_SALT?.trim()),
      approvedSources,
      readyForTest: Boolean(runtime.OPENAI_HOME_API_KEY?.trim() && runtime.HOME_AI_ID_HASH_SALT?.trim() && approvedSources > 0),
      rawChatStored: false,
      historyMessages: 6,
      externalActions: false,
      separateFromMarketingAi: true,
      separateFromIntelligentAi: true,
    },
    usage: {
      month,
      requests: Number(usage?.requests || 0),
      inputTokens: Number(usage?.input_tokens || 0),
      outputTokens: Number(usage?.output_tokens || 0),
      estimatedCostUsd: Number(usage?.estimated_cost_usd || 0),
      activeSubjects: Number(usage?.active_subjects || 0),
      authoritativeBilling: "OpenAI Platform project budget",
    },
    audit: recentAudit.map((row) => ({ eventType: row.event_type, model: row.model, status: row.status, createdAt: row.created_at })),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize();
  if (auth.error || !auth.user) return auth.error;
  const raw = await request.json().catch(() => null) as { settings?: unknown; revision?: string | null } | null;
  if (!raw) return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  const settings = normalizeHomeAiSettings(raw.settings);
  const runtime = env as unknown as HomeAiRuntime;
  if (settings.mode === "production") {
    const knowledge = await readKnowledge();
    const approvedSources = knowledge.entries.filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public").length;
    if (!runtime.OPENAI_HOME_API_KEY?.trim() || !runtime.HOME_AI_ID_HASH_SALT?.trim() || approvedSources < 1) {
      return reply({ error: "Production горимд орохын өмнө тусдаа OpenAI key, identity salt болон Approved + Public мэдлэг бэлэн байх ёстой." }, 409);
    }
  }
  const revision = await saveContentWithRevision({ key: HOME_AI_SETTINGS_KEY, value: settings, userId: auth.user.id, expectedRevision: raw.revision ?? null });
  if (!revision) return reply({ error: conflictMessage() }, 409);
  return reply({ saved: true, settings, revision });
}
