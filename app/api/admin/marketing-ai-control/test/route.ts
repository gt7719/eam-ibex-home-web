import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { hasTrustedOrigin, saveContentWithRevision } from "../../../../lib/admin-security";
import { MARKETING_AI_PROMPT_VERSION, MARKETING_AI_SETTINGS_KEY, marketingAiSettingsFingerprint, readMarketingAiSettings } from "../../../../lib/marketing-ai-control";
import { marketingAiOpenAiHttpError, marketingAiOpenAiMessage, marketingAiOutputText, normalizeMarketingAiOpenAiError, type MarketingAiOpenAiPayload } from "../../../../lib/marketing-ai-openai";
import { marketingAiInstructions } from "../../../../lib/marketing-ai-prompt";
import { getAdminSession, hasMarketingAdminPermission } from "../../../../lib/site-admin";
import type { CustomerAiDatabase } from "../../../../lib/customer-ai";

export const dynamic = "force-dynamic";
type Runtime = { DB: CustomerAiDatabase; OPENAI_MARKETING_API_KEY?: string };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasMarketingAdminPermission(user, "marketing.settings")) return NextResponse.json({ error: "Marketing AI тестлэх эрх олгогдоогүй байна." }, { status: 403 });
  const runtime = env as unknown as Runtime;
  if (!runtime.OPENAI_MARKETING_API_KEY?.trim()) return NextResponse.json({ error: "OPENAI_MARKETING_API_KEY нууц тохиргоо оруулаагүй эсвэл шинэ deploy-д идэвхжээгүй байна." }, { status: 503 });
  const { settings, revision } = await readMarketingAiSettings(runtime.DB);
  if (settings.mode === "disabled") return NextResponse.json({ error: "Эхлээд Test горимыг сонгож хадгална уу." }, { status: 409 });
  const models = [...new Set([settings.fastModel, settings.detailedModel, settings.fallbackModel])], started = Date.now();
  try {
    const checks = await Promise.all(models.map(async model => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${runtime.OPENAI_MARKETING_API_KEY}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ model, store: false, max_output_tokens: 180, instructions: marketingAiInstructions(settings, "general", "mn"), input: "Холболт, Draft-only болон хүний баталгаажуулалтын хамгаалалт хэвийн эсэхийг нэг өгүүлбэрээр баталгаажуул. Гадаад үйлдэл бүү гүйцэтгэ." }),
      });
      if (!response.ok) throw await marketingAiOpenAiHttpError(response);
      const payload = await response.json() as MarketingAiOpenAiPayload;
      return { model, message: marketingAiOutputText(payload).slice(0, 300), inputTokens: Number(payload.usage?.input_tokens || 0), outputTokens: Number(payload.usage?.output_tokens || 0) };
    }));
    const testedAt = new Date().toISOString(), testedFingerprint = await marketingAiSettingsFingerprint(settings);
    const testedSettings = { ...settings, testedAt, testedFingerprint, testedBy: user.id };
    const savedRevision = await saveContentWithRevision({ key: MARKETING_AI_SETTINGS_KEY, value: testedSettings, userId: user.id, expectedRevision: revision });
    if (!savedRevision) return NextResponse.json({ error: "Тестийн үед тохиргоо өөрчлөгдсөн байна. Шинэчлээд дахин тестлэнэ үү.", code: "SETTINGS_CONFLICT" }, { status: 409 });
    const latestRevision = await runtime.DB.prepare("SELECT COALESCE(MAX(revision),0) AS revision FROM marketing_ai_revisions WHERE entity_type='settings' AND entity_id=?")
      .bind(MARKETING_AI_SETTINGS_KEY).first<{ revision: number }>();
    await runtime.DB.batch([
      runtime.DB.prepare("INSERT INTO marketing_ai_revisions (id,entity_type,entity_id,revision,change_type,snapshot_json,changed_by,note,created_at) VALUES (?,'settings',?,?,'configuration_test',?,?,NULL,?)")
        .bind(crypto.randomUUID(), MARKETING_AI_SETTINGS_KEY, Number(latestRevision?.revision || 0) + 1, JSON.stringify(testedSettings), user.id, testedAt),
      runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), user.id, "marketing_ai.configuration_test", models.join(","), "completed", JSON.stringify({ promptVersion: MARKETING_AI_PROMPT_VERSION, models, outboundExecuted: false, humanApprovalRequired: true }), testedAt),
    ]);
    return NextResponse.json({ ok: true, testedAt, promptVersion: MARKETING_AI_PROMPT_VERSION, latencyMs: Date.now() - started, checks, safety: { outboundLocked: true, humanApprovalRequired: true, isolated: true } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const problem = normalizeMarketingAiOpenAiError(error);
    await runtime.DB.prepare("INSERT INTO marketing_ai_audit_events (id,admin_id,event_type,model,status,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), user.id, "marketing_ai.configuration_test", models.join(","), problem.code, JSON.stringify({ promptVersion: MARKETING_AI_PROMPT_VERSION, outboundExecuted: false }), new Date().toISOString()).run().catch(() => null);
    return NextResponse.json({ error: marketingAiOpenAiMessage(problem.code, "mn"), code: problem.code }, { status: problem.httpStatus });
  }
}
