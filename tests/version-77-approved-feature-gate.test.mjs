import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("approved feature registry keeps every accepted release contract explicit", () => {
  const registry = JSON.parse(read("APPROVED-FEATURES.json"));
  assert.equal(registry.baseline.siteVersion, 76);
  assert.equal(registry.baseline.commit, "6d1a9e7238d70ae2427ddd832c365d9f48e81fa4");
  const ids = new Set(registry.features.map((feature) => feature.id));
  for (const id of [
    "V55-HOME-AI-BOUNDARY",
    "V59-AI-CONTROLS",
    "V67-WEB-VERIFICATION-POLICY",
    "V74-PUBLISHED-PROMPT",
    "V75-OPEN-KNOWLEDGE",
    "V76-PROJECT-IMPLEMENTERS",
    "V76-ADMIN-PERMISSIONS",
    "V76-WEB-VERIFICATION",
    "V77-RELEASE-GOVERNANCE",
  ]) assert.ok(ids.has(id), `missing approved feature ${id}`);
  assert.ok(registry.features.every((feature) => feature.mustPreserve.length > 0));
});

test("Published Prompt is versioned, tested and shared by admin and production", () => {
  const settings = read("app/lib/home-ai-control.ts");
  const prompt = read("app/lib/home-ai-prompt.ts");
  const control = read("app/api/admin/home-ai-control/route.ts");
  const testRoute = read("app/api/admin/home-ai-control/test/route.ts");
  const chat = read("app/api/assistant/chat/route.ts");
  const admin = read("app/admin/home-ai/page.tsx");
  assert.match(settings, /publishedPromptTestedId/);
  assert.match(settings, /publishedPromptIsTested/);
  assert.match(prompt, /prompt: \{[\s\S]*id: settings\.publishedPromptId/);
  assert.match(prompt, /version: settings\.publishedPromptVersion/);
  assert.match(control, /settings\.promptMode === "published" && !publishedPromptIsTested\(settings\)/);
  assert.match(testRoute, /publishedPromptTestedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(chat, /homeAiPromptRequest\(input\.settings, input\.lang\)/);
  assert.match(admin, /OpenAI Published Prompt ID/);
  assert.match(admin, /Prompt version/);
});

test("incomplete structured output and prompt errors remain explicit", () => {
  const errors = read("app/lib/home-ai-openai.ts");
  assert.match(errors, /payload\.status === "incomplete"/);
  assert.match(errors, /invalid_or_truncated_json/);
  for (const code of ["PROMPT_NOT_FOUND", "PROMPT_VERSION_INVALID", "OUTPUT_INCOMPLETE", "OPENAI_TIMEOUT"])
    assert.match(errors, new RegExp(`"${code}"`));
});

test("structured-output parser rejects the exact truncated JSON failure mode", async () => {
  const { HomeAiOpenAiError, parseHomeAiStructuredOutput } = await import("../app/lib/home-ai-openai.ts");
  assert.throws(
    () => parseHomeAiStructuredOutput({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: '{"answer":"тасарсан' }),
    (error) => error instanceof HomeAiOpenAiError && error.code === "OUTPUT_INCOMPLETE",
  );
  assert.throws(
    () => parseHomeAiStructuredOutput({ status: "completed", output_text: '{"answer":"unterminated' }),
    (error) => error instanceof HomeAiOpenAiError && error.code === "OUTPUT_INCOMPLETE",
  );
  assert.deepEqual(
    parseHomeAiStructuredOutput({ status: "completed", output_text: '{"answer":"ok"}' }),
    { answer: "ok" },
  );
});

test("all approved v76 administration contracts remain present", () => {
  const hub = read("app/admin/page.tsx");
  const admins = read("app/admin/users/page.tsx");
  const users = read("app/admin/site-users/page.tsx");
  const usersRoute = read("app/api/admin/site-users/route.ts");
  assert.match(hub, /mn: "Төсөл хэрэгжүүлэгчид"/);
  assert.match(hub, /permission: "partners\.manage"/);
  assert.match(hub, /permission: "people\.manage"/);
  assert.match(admins, /Бүгдийг сонгох/);
  assert.match(admins, /beforeunload/);
  for (const label of ["Хэрэглэгчид", "Баталгаажуулалтын тохиргоо", "Илгээлтийн түүх"])
    assert.match(users, new RegExp(label));
  assert.match(usersRoute, /WHERE account_status IN \('pending','limited'\)/);
  assert.match(usersRoute, /ORDER BY e\.created_at DESC LIMIT 100/);
});

test("release governance blocks silent feature removal", () => {
  const governance = read("RELEASE-GOVERNANCE.md");
  assert.match(governance, /latest published Site version/);
  assert.match(governance, /No silent removal/);
  assert.match(governance, /exact tested commit/);
  assert.match(governance, /must not be cleared or replaced with a default/);
});
