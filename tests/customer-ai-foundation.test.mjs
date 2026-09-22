import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Home AI uses the server-side Responses API with stateless structured output", () => {
  const route = read("app/api/assistant/chat/route.ts");
  assert.match(route, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(route, /store: false/);
  assert.match(route, /safety_identifier: input\.subjectHash/);
  assert.match(route, /type: "json_schema"/);
  assert.match(route, /additionalProperties: false/);
  assert.match(route, /HOME_AI_ID_HASH_SALT/);
  assert.match(route, /homeAiSettings/);
  assert.doesNotMatch(read("public/assistant-widget.js"), /OPENAI_API_KEY/);
});

test("Home AI cost, consent and audit records are isolated from Hybrid AI", () => {
  const schema = read("db/schema.ts");
  const core = read("app/lib/customer-ai.ts");
  const route = read("app/api/assistant/chat/route.ts");
  for (const table of ["customer_ai_consents", "customer_ai_rate_limits", "customer_ai_monthly_usage", "customer_ai_audit_events"]) {
    assert.match(schema, new RegExp(`\\"${table}\\"`));
  }
  assert.match(core, /dynamic_fair_share|fairShareUsd|activeSubjects/);
  assert.match(core, /recordCustomerAiConsent/);
  assert.match(core, /messageLength/);
  assert.doesNotMatch(route, /ai_monthly_usage|ai_audit_events|ai_approvals|AGENTIC_TENANT/);
});

test("external marketing actions remain blocked and require a later approval path", () => {
  const route = read("app/api/assistant/chat/route.ts");
  const prompt = read("app/lib/home-ai-prompt.ts");
  const knowledge = read("app/lib/assistant-knowledge.ts");
  const marketing = read("app/admin/marketing-ai/page.tsx");
  assert.match(route, /externalActions: "blocked_pending_admin_approval"/);
  assert.match(prompt, /Never claim that an email, social post, campaign/);
  assert.match(knowledge, /имэйл, сошиал нийтлэл, кампанит ажил/);
  assert.match(knowledge, /зөвхөн админд нээлттэй iBeX Marketing AI/);
  assert.match(marketing, /Гадагш илгээх/);
  assert.match(marketing, /Хүний баталгаажуулалт/);
  assert.match(marketing, /OAuth эсвэл хязгаарлагдсан token/);
});

test("the browser sends only short-lived chat context after explicit consent", () => {
  const widget = read("public/assistant-widget.js");
  const core = read("app/lib/customer-ai.ts");
  assert.match(widget, /history\.slice\(-6\)/);
  assert.match(widget, /sessionStorage/);
  assert.match(widget, /consentEnabled\(\)/);
  assert.match(core, /input\.consent !== true/);
  assert.match(core, /\.slice\(-6\)/);
  assert.match(core, /customerAiGuard/);
  assert.match(widget, /href="\/privacy"/);
});

test("WebMCP can open the same visible assistant without submitting a paid request", () => {
  const widget = read("public/assistant-widget.js");
  assert.match(widget, /document\.modelContext/);
  assert.match(widget, /name: "start_ibex_home_ai"/);
  assert.match(widget, /questionSubmitted: false/);
  assert.match(widget, /consentRequired: !consentEnabled\(\)/);
});
