import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  customerAiConfig,
  estimateCustomerAiCost,
  hashCustomerAiSubject,
  recordCustomerAiOutcome,
  type CustomerAiDatabase,
} from "../../../../lib/customer-ai";
import { HOME_AI_SETTINGS_KEY, readHomeAiSettings } from "../../../../lib/home-ai-control";
import { homeAiPromptRequest, homeAiSafetyBoundary } from "../../../../lib/home-ai-prompt";
import {
  homeAiCompletedOutputText,
  homeAiOpenAiHttpError,
  homeAiOpenAiMessage,
  normalizeHomeAiOpenAiError,
  type HomeAiOpenAiPayload,
} from "../../../../lib/home-ai-openai";
import { hasTrustedOrigin, saveContentWithRevision } from "../../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../../lib/site-admin";

export const dynamic = "force-dynamic";

type Runtime = {
  DB: CustomerAiDatabase;
  OPENAI_HOME_API_KEY?: string;
  HOME_AI_ID_HASH_SALT?: string;
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) return NextResponse.json({ error: "Home AI тестлэх эрх олгогдоогүй байна." }, { status: 403 });
  const runtime = env as unknown as Runtime;
  if (!runtime.OPENAI_HOME_API_KEY?.trim()) return NextResponse.json({ error: "OPENAI_HOME_API_KEY нууц тохиргоо оруулаагүй байна." }, { status: 503 });
  if (!runtime.HOME_AI_ID_HASH_SALT?.trim()) return NextResponse.json({ error: "HOME_AI_ID_HASH_SALT нууц тохиргоо дутуу байна." }, { status: 503 });
  const { settings, revision } = await readHomeAiSettings(runtime.DB);
  if (settings.mode === "disabled") return NextResponse.json({ error: "Эхлээд Test горимыг сонгож хадгална уу." }, { status: 409 });
  if (settings.promptMode === "published" && !settings.publishedPromptId) {
    return NextResponse.json({ error: "Published Prompt горимд Prompt ID оруулж хадгална уу.", code: "PROMPT_NOT_FOUND" }, { status: 409 });
  }
  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.OPENAI_HOME_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(18_000),
      body: JSON.stringify({
        model: settings.fastModel,
        store: false,
        max_output_tokens: Math.min(600, Math.max(300, settings.maxOutputTokens)),
        safety_identifier: await hashCustomerAiSubject(`admin-test:${user.id}`, runtime.HOME_AI_ID_HASH_SALT),
        ...homeAiPromptRequest(settings, "mn"),
        input: `${homeAiSafetyBoundary("mn")}\n\nХолболт хэвийн эсэхийг нэг өгүүлбэрээр баталгаажуул. Гадаад үйлдэл бүү гүйцэтгэ.`,
      }),
    });
    if (!response.ok) throw await homeAiOpenAiHttpError(response, settings.promptMode === "published", Boolean(settings.publishedPromptVersion));
    const payload = await response.json() as HomeAiOpenAiPayload;
    const message = homeAiCompletedOutputText(payload).slice(0, 400);
    const inputTokens = Number(payload.usage?.input_tokens || 0), outputTokens = Number(payload.usage?.output_tokens || 0);
    if (settings.promptMode === "published") {
      const savedRevision = await saveContentWithRevision({
        key: HOME_AI_SETTINGS_KEY,
        value: {
          ...settings,
          publishedPromptTestedAt: new Date().toISOString(),
          publishedPromptTestedId: settings.publishedPromptId,
          publishedPromptTestedVersion: settings.publishedPromptVersion,
        },
        userId: user.id,
        expectedRevision: revision,
      });
      if (!savedRevision) {
        return NextResponse.json({ error: "Тестийн үед тохиргоо өөрчлөгдсөн байна. Хуудсыг шинэчлээд дахин тестлэнэ үү.", code: "SETTINGS_CONFLICT" }, { status: 409 });
      }
    }
    const config = customerAiConfig({ HOME_AI_ID_HASH_SALT: runtime.HOME_AI_ID_HASH_SALT }, settings);
    await recordCustomerAiOutcome({
      db: runtime.DB,
      requestId: crypto.randomUUID(),
      subjectHash: await hashCustomerAiSubject(`admin-test:${user.id}`, runtime.HOME_AI_ID_HASH_SALT),
      eventType: "customer_ai.admin_test",
      status: "completed",
      model: settings.fastModel,
      intent: "general",
      sourceIds: [],
      messageLength: 0,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCustomerAiCost(config, settings.fastModel, inputTokens, outputTokens),
      metadata: { adminTest: true, promptMode: settings.promptMode, promptVersion: settings.publishedPromptVersion || null },
    });
    return NextResponse.json({ ok: true, model: settings.fastModel, promptMode: settings.promptMode, latencyMs: Date.now() - started, message }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const openAiError = normalizeHomeAiOpenAiError(error);
    console.error("home_ai_admin_test_failed", openAiError.code);
    return NextResponse.json({ error: homeAiOpenAiMessage(openAiError.code, "mn"), code: openAiError.code }, { status: openAiError.httpStatus });
  }
}
