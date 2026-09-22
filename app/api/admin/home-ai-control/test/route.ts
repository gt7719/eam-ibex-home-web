import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  customerAiConfig,
  estimateCustomerAiCost,
  hashCustomerAiSubject,
  recordCustomerAiOutcome,
  type CustomerAiDatabase,
} from "../../../../lib/customer-ai";
import { readHomeAiSettings } from "../../../../lib/home-ai-control";
import { homeAiInstructions } from "../../../../lib/home-ai-prompt";
import { hasTrustedOrigin } from "../../../../lib/admin-security";
import { getAdminSession, hasAdminPermission } from "../../../../lib/site-admin";

export const dynamic = "force-dynamic";

type Runtime = {
  DB: CustomerAiDatabase;
  OPENAI_HOME_API_KEY?: string;
  HOME_AI_ID_HASH_SALT?: string;
};

function outputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  return payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text || "";
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
  const user = await getAdminSession();
  if (!user) return NextResponse.json({ error: "Админ нэвтрэлт шаардлагатай." }, { status: 401 });
  if (!hasAdminPermission(user, "knowledge.manage")) return NextResponse.json({ error: "Home AI тестлэх эрх олгогдоогүй байна." }, { status: 403 });
  const runtime = env as unknown as Runtime;
  if (!runtime.OPENAI_HOME_API_KEY?.trim()) return NextResponse.json({ error: "OPENAI_HOME_API_KEY нууц тохиргоо оруулаагүй байна." }, { status: 503 });
  if (!runtime.HOME_AI_ID_HASH_SALT?.trim()) return NextResponse.json({ error: "HOME_AI_ID_HASH_SALT нууц тохиргоо дутуу байна." }, { status: 503 });
  const { settings } = await readHomeAiSettings(runtime.DB);
  if (settings.mode === "disabled") return NextResponse.json({ error: "Эхлээд Test горимыг сонгож хадгална уу." }, { status: 409 });
  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.OPENAI_HOME_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(18_000),
      body: JSON.stringify({
        model: settings.fastModel,
        store: false,
        max_output_tokens: 80,
        safety_identifier: await hashCustomerAiSubject(`admin-test:${user.id}`, runtime.HOME_AI_ID_HASH_SALT),
        instructions: homeAiInstructions("mn"),
        input: "Холболт хэвийн эсэхийг нэг өгүүлбэрээр баталгаажуул. Гадаад үйлдэл бүү гүйцэтгэ.",
      }),
    });
    if (!response.ok) throw new Error(`openai_${response.status}`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const inputTokens = Number(payload.usage?.input_tokens || 0), outputTokens = Number(payload.usage?.output_tokens || 0);
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
      metadata: { adminTest: true },
    });
    return NextResponse.json({ ok: true, model: settings.fastModel, latencyMs: Date.now() - started, message: outputText(payload).slice(0, 400) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("home_ai_admin_test_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "OpenAI холболтын тест амжилтгүй боллоо. Project key, model access болон billing-ээ шалгана уу." }, { status: 502 });
  }
}
