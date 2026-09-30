import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("R1 hardening keeps dynamic tokens, bounded retry, normalized usage and revisions", () => {
  const control = read("app/lib/marketing-ai-control.ts");
  const run = read("app/api/admin/marketing-ai-run/route.ts");
  const usage = read("app/lib/marketing-ai-usage.ts");
  assert.match(control, /tokenPolicy: Record<MarketingAiPromptProfile, number>/);
  assert.match(control, /incompleteRetryLimit/);
  assert.match(run, /problem\.code === "OUTPUT_INCOMPLETE"/);
  assert.match(run, /marketingAiTokenBudget/);
  assert.match(run, /marketing_ai_revisions/);
  assert.match(usage, /cachedInputTokens/);
  assert.match(usage, /reasoningTokens/);
  assert.match(usage, /MARKETING_AI_COST_CATALOG_VERSION/);
});

test("R2 through R7 use durable governed records and never execute outbound or spend", () => {
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0012_shocking_jasper_sitwell.sql");
  const route = read("app/api/admin/marketing-ai-workspace/route.ts");
  for (const domain of ["knowledge", "leads", "content", "campaigns", "channels", "automation"]) assert.match(route, new RegExp(domain));
  assert.match(schema, /marketingAiRecords/);
  assert.match(schema, /marketingAiRevisions/);
  assert.match(migration, /CREATE TABLE `marketing_ai_records`/);
  assert.match(migration, /CREATE TABLE `marketing_ai_revisions`/);
  assert.match(route, /outboundExecuted: false/);
  assert.match(route, /spendExecuted: false/);
  assert.match(route, /Гадагш нийтлэх ажиллагаа хаалттай/);
});

test("workspace normalization removes credential fields and suspicious secret values", async () => {
  const workspace = await import("../app/lib/marketing-ai-workspace.ts");
  const result = workspace.normalizeMarketingAiData({ body: "approved", password: "bad", api_key: "bad", note: "sk-example123456" });
  assert.deepEqual(result, { body: "approved" });
});

test("R8 analytics and the complete administrator workspaces are visible", () => {
  const page = read("app/admin/marketing-ai/page.tsx");
  for (const label of ["Мэдлэг ба загвар", "Хэрэглэгч ба Lead", "Контент төлөвлөгөө", "Кампанит ажил", "Email ба Social", "Автоматжуулалт", "Аналитик ба тайлан"])
    assert.match(page, new RegExp(label));
  assert.match(page, /GOVERNED WORKSPACE/);
  assert.match(page, /Revision \+ Audit/);
  assert.match(page, /VERIFIED METRICS/);
  assert.match(page, /Гадагш үйлдэл хийгдээгүй/);
});

test("release registry preserves the V77 governance baseline and adds the complete R1-R8 contract", () => {
  const registry = JSON.parse(read("APPROVED-FEATURES.json"));
  assert.equal(registry.baseline.siteVersion, 77);
  assert.equal(registry.baseline.commit, "530d57a3b7ecdf4f1fab2bfb9b259619ee7a8116");
  assert.ok(registry.features.some(feature => feature.id === "V79-MARKETING-AI-R1-R8"));
});
