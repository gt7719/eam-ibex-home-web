import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { conflictMessage, hasTrustedOrigin, saveContentWithRevision } from "../../../lib/admin-security";
import {
  MARKETING_AI_SETTINGS_KEY,
  normalizeMarketingAiSettings,
  readMarketingAiSettings,
} from "../../../lib/marketing-ai-control";
import { getAdminSession, hasAdminPermission } from "../../../lib/site-admin";
import type { CustomerAiDatabase } from "../../../lib/customer-ai";

export const dynamic = "force-dynamic";

type Runtime = {
  DB: CustomerAiDatabase;
  OPENAI_MARKETING_API_KEY?: string;
  MARKETING_EMAIL_OAUTH_TOKEN?: string;
  MARKETING_SOCIAL_OAUTH_TOKEN?: string;
};

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authorize() {
  const user = await getAdminSession();
  if (!user) return { error: reply({ error: "Админ нэвтрэлт шаардлагатай." }, 401), user: null };
  if (!hasAdminPermission(user, "marketing.manage")) return { error: reply({ error: "Marketing AI удирдах эрх олгогдоогүй байна." }, 403), user: null };
  return { error: null, user };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const runtime = env as unknown as Runtime;
  const month = new Date().toISOString().slice(0, 7);
  const { settings, revision } = await readMarketingAiSettings(runtime.DB);
  const [usage, auditResult] = await Promise.all([
    runtime.DB.prepare("SELECT COALESCE(SUM(request_count),0) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd FROM marketing_ai_monthly_usage WHERE month_key=?")
      .bind(month).first<{ requests: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number }>(),
    runtime.DB.prepare("SELECT event_type, model, status, metadata_json, created_at FROM marketing_ai_audit_events ORDER BY created_at DESC LIMIT 20")
      .all<{ event_type: string; model: string | null; status: string; metadata_json: string; created_at: string }>(),
  ]);
  const keyConfigured = Boolean(runtime.OPENAI_MARKETING_API_KEY?.trim());
  const emailConnected = Boolean(runtime.MARKETING_EMAIL_OAUTH_TOKEN?.trim());
  const socialConnected = Boolean(runtime.MARKETING_SOCIAL_OAUTH_TOKEN?.trim());
  return reply({
    settings,
    revision,
    status: {
      keyConfigured,
      emailConnected,
      socialConnected,
      draftReady: keyConfigured,
      outboundReady: false,
      humanApprovalRequired: true,
      separateFromHomeAi: true,
      separateFromIntelligentAi: true,
    },
    usage: {
      month,
      requests: Number(usage?.requests || 0),
      inputTokens: Number(usage?.input_tokens || 0),
      outputTokens: Number(usage?.output_tokens || 0),
      estimatedCostUsd: Number(usage?.estimated_cost_usd || 0),
      authoritativeBilling: "OpenAI Marketing project budget",
    },
    audit: (auditResult.results || []).map((row) => ({ eventType: row.event_type, model: row.model, status: row.status, createdAt: row.created_at })),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize();
  if (auth.error || !auth.user) return auth.error;
  const raw = await request.json().catch(() => null) as { settings?: unknown; revision?: string | null } | null;
  if (!raw) return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  const settings = normalizeMarketingAiSettings(raw.settings);
  const runtime = env as unknown as Runtime;
  if (settings.mode === "production" && !runtime.OPENAI_MARKETING_API_KEY?.trim()) {
    return reply({ error: "Production горимд орохын өмнө OPENAI_MARKETING_API_KEY нууц тохиргоог холбоно уу." }, 409);
  }
  const revision = await saveContentWithRevision({ key: MARKETING_AI_SETTINGS_KEY, value: settings, userId: auth.user.id, expectedRevision: raw.revision ?? null });
  if (!revision) return reply({ error: conflictMessage() }, 409);
  return reply({ saved: true, settings, revision });
}
