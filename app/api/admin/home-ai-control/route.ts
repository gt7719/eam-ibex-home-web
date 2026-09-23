import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { readKnowledge } from "../../../lib/assistant-knowledge";
import { type CustomerAiDatabase } from "../../../lib/customer-ai";
import {
  HOME_AI_SETTINGS_KEY,
  normalizeHomeAiSettings,
  publishedPromptIsTested,
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

async function auditSubject(adminId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`home-ai-admin:${adminId}`));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function auditDetail(value: string) {
  try {
    const metadata = JSON.parse(value) as { promptIdChanged?: boolean; promptVersionChanged?: boolean; promptMode?: string; nextMode?: string; retentionDays?: number };
    if (metadata.promptIdChanged || metadata.promptVersionChanged) return `Prompt configuration changed · ${metadata.promptMode || "—"} · ${metadata.nextMode || "—"}`;
    if (metadata.promptMode) return `${metadata.promptMode} · ${metadata.nextMode || "—"} · ${metadata.retentionDays || "—"} days`;
    if (metadata.nextMode) return `${metadata.nextMode} · ${metadata.retentionDays || "—"} days`;
  } catch {
    // Older audit entries may not contain JSON written by this control.
  }
  return "";
}

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
  const { settings, revision, updatedAt, updatedBy } = await readHomeAiSettings(runtime.DB);
  const [usage, auditResult, knowledge, changedBy] = await Promise.all([
    runtime.DB.prepare(
      "SELECT COALESCE(SUM(request_count),0) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd, COUNT(*) AS active_subjects FROM customer_ai_monthly_usage WHERE month_key=?",
    ).bind(month).first<{ requests: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number; active_subjects: number }>(),
    runtime.DB.prepare(
      "SELECT event_type, model, status, metadata_json, created_at FROM customer_ai_audit_events WHERE channel='ibex-home' ORDER BY created_at DESC LIMIT 12",
    ).all<{ event_type: string; model: string | null; status: string; metadata_json: string; created_at: string }>(),
    readKnowledge(),
    updatedBy ? runtime.DB.prepare("SELECT name,email FROM admin_users WHERE id=? LIMIT 1").bind(updatedBy).first<{ name: string; email: string }>() : Promise.resolve(null),
  ]);
  const approvedSources = knowledge.entries.filter((entry) => entry.enabled && entry.status === "approved" && entry.visibility === "public").length;
  const recentAudit = auditResult.results || [];
  const publishedPromptTested = publishedPromptIsTested(settings);
  const promptStatus = settings.promptMode === "code"
    ? "code"
    : !settings.publishedPromptId
      ? "missing"
      : publishedPromptTested
        ? "ready"
        : "untested";
  return reply({
    settings,
    revision,
    updatedAt,
    updatedBy: changedBy?.name || changedBy?.email || updatedBy,
    status: {
      keyConfigured: Boolean(runtime.OPENAI_HOME_API_KEY?.trim()),
      promptConfigured: Boolean(settings.publishedPromptId),
      promptStatus,
      publishedPromptTested,
      identitySaltConfigured: Boolean(runtime.HOME_AI_ID_HASH_SALT?.trim()),
      approvedSources,
      readyForTest: Boolean(
        runtime.OPENAI_HOME_API_KEY?.trim()
          && runtime.HOME_AI_ID_HASH_SALT?.trim()
          && (settings.promptMode === "code" || settings.publishedPromptId),
      ),
      knowledgeMode: "open",
      rawChatStored: true,
      historyMessages: 6,
      historyRetentionDays: settings.historyRetentionDays,
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
    audit: recentAudit.map((row) => ({ eventType: row.event_type, model: row.model, status: row.status, detail: auditDetail(row.metadata_json), createdAt: row.created_at })),
  });
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return reply({ error: "Origin mismatch" }, 403);
  const auth = await authorize();
  if (auth.error || !auth.user) return auth.error;
  const raw = await request.json().catch(() => null) as { settings?: unknown; revision?: string | null } | null;
  if (!raw) return reply({ error: "Хүсэлтийн формат буруу байна." }, 400);
  const normalizedSettings = normalizeHomeAiSettings(raw.settings);
  const submittedPromptId = raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings)
    ? String((raw.settings as { publishedPromptId?: unknown }).publishedPromptId || "").trim()
    : "";
  const submittedPromptVersion = raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings)
    ? String((raw.settings as { publishedPromptVersion?: unknown }).publishedPromptVersion || "").trim()
    : "";
  if (submittedPromptId && !normalizedSettings.publishedPromptId) return reply({ error: "Published Prompt ID нь pmpt_ угтвартай зөв форматтай байна." }, 400);
  if (submittedPromptVersion && !normalizedSettings.publishedPromptVersion) return reply({ error: "Prompt version нь зөвхөн тоон утгатай байна." }, 400);
  const runtime = env as unknown as HomeAiRuntime;
  const { settings: previousSettings } = await readHomeAiSettings(runtime.DB);
  const promptIdentityUnchanged = previousSettings.publishedPromptId === normalizedSettings.publishedPromptId
    && previousSettings.publishedPromptVersion === normalizedSettings.publishedPromptVersion;
  const settings = {
    ...normalizedSettings,
    publishedPromptTestedAt: promptIdentityUnchanged ? previousSettings.publishedPromptTestedAt : "",
    publishedPromptTestedId: promptIdentityUnchanged ? previousSettings.publishedPromptTestedId : "",
    publishedPromptTestedVersion: promptIdentityUnchanged ? previousSettings.publishedPromptTestedVersion : "",
  };
  if (settings.promptMode === "published" && !settings.publishedPromptId) {
    return reply({ error: "Published Prompt горимд pmpt_ угтвартай Prompt ID шаардлагатай." }, 409);
  }
  if (settings.mode === "production") {
    if (!runtime.OPENAI_HOME_API_KEY?.trim() || !runtime.HOME_AI_ID_HASH_SALT?.trim()) {
      return reply({ error: "Production горимд орохын өмнө тусдаа OpenAI key болон identity salt бэлэн байх ёстой." }, 409);
    }
    if (settings.promptMode === "published" && !publishedPromptIsTested(settings)) {
      return reply({ error: "Published Prompt ID болон version-ийг Test горимд амжилттай шалгасны дараа Production горимд идэвхжүүлнэ үү." }, 409);
    }
  }
  const revision = await saveContentWithRevision({ key: HOME_AI_SETTINGS_KEY, value: settings, userId: auth.user.id, expectedRevision: raw.revision ?? null });
  if (!revision) return reply({ error: conflictMessage() }, 409);
  await runtime.DB.prepare(
    "INSERT INTO customer_ai_audit_events (id,subject_hash,channel,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,'customer_ai.settings_changed',NULL,'completed',?,?)",
  ).bind(
    crypto.randomUUID(),
    await auditSubject(auth.user.id),
    "ibex-home",
    JSON.stringify({
      promptIdChanged: previousSettings.publishedPromptId !== settings.publishedPromptId,
      promptVersionChanged: previousSettings.publishedPromptVersion !== settings.publishedPromptVersion,
      promptConfigured: Boolean(settings.publishedPromptId),
      promptMode: settings.promptMode,
      promptTested: publishedPromptIsTested(settings),
      previousMode: previousSettings.mode,
      nextMode: settings.mode,
      previousRetentionDays: previousSettings.historyRetentionDays,
      retentionDays: settings.historyRetentionDays,
    }),
    revision,
  ).run();
  return reply({ saved: true, settings, revision });
}
