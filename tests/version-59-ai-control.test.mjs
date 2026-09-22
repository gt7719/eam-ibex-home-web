import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("AI management keeps knowledge and adds a separate Home AI control tab", () => {
  const hub = read("app/admin/ai/page.tsx");
  assert.match(hub, /Home AI удирдлага/);
  assert.match(hub, /Home AI мэдлэгийн сан/);
  assert.match(hub, /Маркетинг AI/);
  assert.ok(hub.indexOf("Home AI удирдлага") < hub.indexOf("Home AI мэдлэгийн сан"));
});

test("Home, Marketing and Intelligent AI use isolated server-side key names", () => {
  const home = read("app/api/assistant/chat/route.ts");
  const marketing = read("app/api/admin/marketing-ai-run/route.ts");
  const intelligent = read("app/api/agentic/run/route.ts");
  assert.match(home, /OPENAI_HOME_API_KEY/);
  assert.match(marketing, /OPENAI_MARKETING_API_KEY/);
  assert.match(intelligent, /OPENAI_INTELLIGENT_API_KEY/);
  assert.doesNotMatch(home, /OPENAI_MARKETING_API_KEY|OPENAI_INTELLIGENT_API_KEY/);
  assert.doesNotMatch(marketing, /OPENAI_HOME_API_KEY|OPENAI_INTELLIGENT_API_KEY/);
});

test("both API-backed assistants use Responses with storage disabled", () => {
  for (const path of ["app/api/assistant/chat/route.ts", "app/api/admin/marketing-ai-run/route.ts"]) {
    const source = read(path);
    assert.match(source, /\/v1\/responses/);
    assert.match(source, /store: false/);
  }
});

test("Marketing AI is draft-only with isolated durable usage and audit", () => {
  const route = read("app/api/admin/marketing-ai-run/route.ts");
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0007_steady_calypso.sql");
  assert.match(route, /outboundExecuted: false/);
  assert.match(route, /humanApprovalRequired: true/);
  assert.match(schema, /marketing_ai_monthly_usage/);
  assert.match(schema, /marketing_ai_audit_events/);
  assert.match(migration, /CREATE TABLE `marketing_ai_monthly_usage`/);
  assert.match(migration, /CREATE TABLE `marketing_ai_audit_events`/);
});

test("Home AI production is controlled by the admin setting without a knowledge-source gate", () => {
  const route = read("app/api/assistant/chat/route.ts");
  const control = read("app/api/admin/home-ai-control/route.ts");
  assert.match(route, /homeAiSettings\.mode !== "production"/);
  assert.doesNotMatch(control, /approvedSources < 1/);
  assert.match(control, /knowledgeMode: "open"/);
  assert.match(route, /CUSTOMER_AI_DATA_BOUNDARY/);
});
