import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("hybrid AI lab is separate, shadow-only and ready for approved connection", () => {
  const page = read("app/ai-lab/page.tsx");
  const websiteAssistant = read("app/api/assistant/chat/route.ts");
  assert.match(page, /DEMO \/ SHADOW MODE/);
  assert.match(page, /Үндсэн iBeX-д холбоогүй/);
  assert.match(page, /Open-source analytics/);
  assert.match(page, /iBeX Engineer AI/);
  assert.doesNotMatch(websiteAssistant, /agentic-ai|gpt-5\.6/);
});

test("agentic route enforces bounded schema, tenant and action controls", () => {
  const route = read("app/api/agentic/run/route.ts");
  const core = read("app/lib/agentic-ai.ts");
  assert.match(route, /allowedKeys = new Set\(\["question", "scenario", "action", "lang"\]\)/);
  assert.match(core, /AGENTIC_TENANT = "DEMO-TENANT"/);
  assert.match(route, /automaticSafetyAction: false/);
  assert.match(core, /action === "email_team" \|\| action === "bulk_schedule"/);
  assert.match(route, /pending_admin_approval/);
  assert.match(route, /executed: false/);
});

test("routing, approved RAG, budget and audit policies are explicit", () => {
  const route = read("app/api/agentic/run/route.ts");
  const core = read("app/lib/agentic-ai.ts");
  assert.match(core, /PRIMARY_MODEL = "gpt-5\.6-luna"/);
  assert.match(core, /FALLBACK_MODEL = "gpt-5\.6-terra"/);
  assert.match(core, /MONTHLY_BUDGET_USD = 20/);
  assert.match(core, /BUDGET_WARNING_USD = 14/);
  assert.match(core, /BUDGET_CRITICAL_USD = 18/);
  assert.match(core, /entry\.enabled && entry\.status === "approved" && entry\.visibility === "public"/);
  assert.match(route, /INSERT INTO ai_audit_events/);
  assert.match(route, /llm: true, tools: true/);
});
