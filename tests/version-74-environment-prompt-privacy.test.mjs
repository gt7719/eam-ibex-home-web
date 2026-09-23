import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("environment names, status, visibility and routes use one published configuration", async () => {
  const model = await read("app/lib/navigation.ts");
  const adapter = await read("public/navigation-content.js");
  const web = await read("app/organization/page.tsx");
  const mobile = await read("app/mobile/page.tsx");
  const worker = await read("worker/index.ts");
  const buildConfig = await read("vite.config.ts");

  for (const field of ["nameMn", "nameEn", "descriptionMn", "descriptionEn", "status", "visible", "href"]) {
    assert.match(model, new RegExp(`${field}:`));
  }
  assert.match(adapter, /configuredEnvironments\(config\)/);
  assert.match(adapter, /row\.status==='preview'/);
  assert.match(web, /payload\?\.content\?\.navigation/);
  assert.match(mobile, /payload\?\.content\?\.navigation/);
  assert.match(worker, /protectedEnvironment\(url\.pathname\)/);
  assert.match(worker, /hasActiveAdminSession\(request, env\)/);
  assert.match(worker, /status: 404/);
  assert.match(buildConfig, /run_worker_first/);
  assert.match(buildConfig, /"\/mobile-preview\/\*"/);
  assert.match(web, /adminPreview=1/);
  assert.match(mobile, /adminPreview=1/);
});

test("Home AI Prompt ID remains server-side and can be selected with a tested version", async () => {
  const settings = await read("app/lib/home-ai-control.ts");
  const admin = await read("app/admin/home-ai/page.tsx");
  const control = await read("app/api/admin/home-ai-control/route.ts");
  const chat = await read("app/api/assistant/chat/route.ts");
  const connectionTest = await read("app/api/admin/home-ai-control/test/route.ts");

  assert.match(settings, /publishedPromptId: string/);
  assert.match(settings, /publishedPromptVersion: string/);
  assert.match(settings, /promptMode: HomeAiPromptMode/);
  assert.match(settings, /\^pmpt_/);
  const prompt = await read("app/lib/home-ai-prompt.ts");
  assert.match(admin, /OpenAI Published Prompt ID/);
  assert.match(admin, /Prompt version/);
  assert.match(admin, /Code-managed fallback/);
  assert.match(admin, /API key нь server-ийн нууц environment variable/);
  assert.match(control, /promptConfigured: Boolean\(settings\.publishedPromptId\)/);
  assert.match(control, /customer_ai\.settings_changed/);
  assert.match(control, /promptIdChanged/);
  assert.match(control, /publishedPromptIsTested/);
  assert.match(prompt, /prompt: \{/);
  assert.match(prompt, /id: settings\.publishedPromptId/);
  assert.match(prompt, /version: settings\.publishedPromptVersion/);
  assert.match(chat, /homeAiPromptRequest\(input\.settings, input\.lang\)/);
  assert.match(prompt, /general model knowledge/);
  assert.match(chat, /store: false/);
  assert.match(connectionTest, /homeAiPromptRequest\(settings, "mn"\)/);
  assert.doesNotMatch(admin, /OPENAI_HOME_API_KEY\s*=/);
});

test("Privacy v2 consent, retention and account deletion protect stored Home AI history", async () => {
  const history = await read("app/lib/home-ai-history.ts");
  const consent = await read("app/api/account/privacy-consent/route.ts");
  const deletion = await read("app/api/account/deletion-request/route.ts");
  const drawer = await read("app/components/home-ai-drawer.tsx");

  assert.match(history, /created_at<\?/);
  assert.match(history, /MAX_STORED_MESSAGES = 120/);
  assert.match(consent, /hasTrustedOrigin\(request\)/);
  assert.match(consent, /privacy_version=\?/);
  assert.match(deletion, /DELETE FROM customer_ai_messages WHERE user_id=\?/);
  assert.match(drawer, /PRIVACY_RECONSENT_REQUIRED/);
  assert.match(drawer, /privacy-consent/);
});
