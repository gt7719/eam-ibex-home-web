import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Marketing AI preserves isolation and keeps outbound execution locked", () => {
  const settings = read("app/lib/marketing-ai-control.ts");
  const prompt = read("app/lib/marketing-ai-prompt.ts");
  const run = read("app/api/admin/marketing-ai-run/route.ts");
  assert.match(settings, /outboundEnabled: false/);
  assert.match(settings, /humanApprovalRequired: true/);
  assert.match(prompt, /isolated from public Home AI/);
  assert.match(prompt, /Outbound is locked/);
  assert.match(run, /outboundExecuted: false/);
  assert.doesNotMatch(run, /OPENAI_HOME_API_KEY/);
});

test("Marketing AI production requires a successful fingerprinted test", () => {
  const settings = read("app/lib/marketing-ai-control.ts");
  const control = read("app/api/admin/marketing-ai-control/route.ts");
  const testRoute = read("app/api/admin/marketing-ai-control/test/route.ts");
  assert.match(settings, /marketingAiSettingsFingerprint/);
  assert.match(settings, /MARKETING_AI_PROMPT_VERSION/);
  assert.match(control, /settings\.mode === "production" && !await marketingAiSettingsIsTested\(settings\)/);
  assert.match(testRoute, /testedFingerprint = await marketingAiSettingsFingerprint\(settings\)/);
  assert.match(testRoute, /new Set\(\[settings\.fastModel, settings\.detailedModel, settings\.fallbackModel\]\)/);
});

test("structured output failures are explicit and model fallback is bounded", async () => {
  const errors = await import("../app/lib/marketing-ai-openai.ts");
  assert.throws(() => errors.parseMarketingAiStructuredOutput({ status: "incomplete", output_text: '{"draft":"cut' }), error => error.code === "OUTPUT_INCOMPLETE");
  assert.throws(() => errors.parseMarketingAiStructuredOutput({ status: "completed", output_text: '{"draft":' }), error => error.code === "OUTPUT_INCOMPLETE");
  assert.deepEqual(errors.parseMarketingAiStructuredOutput({ status: "completed", output_text: '{"draft":"ok"}' }), { draft: "ok" });
  const run = read("app/api/admin/marketing-ai-run/route.ts");
  assert.match(run, /OPENAI_TIMEOUT/);
  assert.match(run, /settings\.fallbackModel === model/);
});

test("draft approval workflow is additive, optimistic, and audited", () => {
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0011_amused_magdalene.sql");
  const route = read("app/api/admin/marketing-ai-drafts/route.ts");
  assert.match(schema, /marketingAiDrafts/);
  assert.match(migration, /CREATE TABLE `marketing_ai_drafts`/);
  assert.match(route, /draft: \["submit"\]/);
  assert.match(route, /review: \["approve", "reject", "return_to_draft"\]/);
  assert.match(route, /WHERE id=\? AND revision=\?/);
  assert.match(route, /marketing_ai\.approval_decision/);
});

test("admin UI exposes grouped configuration, test center, workflow and dirty guard", () => {
  const page = read("app/admin/marketing-ai/page.tsx");
  for (const text of ["Хурдан model", "Нарийвчилсан model", "Fallback model", "Prompt profile", "Брэндийн өнгө аяс", "Бүх тохиргоог тестлэх", "Draft ба зөвшөөрлийн төв"])
    assert.match(page, new RegExp(text));
  assert.match(page, /beforeunload/);
  assert.match(page, /ibex-admin-dirty/);
  assert.match(page, /marketing-ai-save-bar/);
  const permissions = read("app/lib/site-admin.ts");
  for (const scope of ["marketing.settings", "marketing.draft", "marketing.approve", "marketing.audit"])
    assert.match(permissions, new RegExp(scope.replace(".", "\\.")));
  assert.match(permissions, /hasAdminPermission\(user, "marketing\.manage"\)/);
});
