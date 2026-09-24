import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("all JSON mutation routes use bounded streaming readers", () => {
  const routes = readFileSync(new URL("../app/lib/http-input.ts", import.meta.url), "utf8");
  assert.match(routes, /request\.body\.getReader\(\)/);
  const routeSources = [
    "app/api/account/register/route.ts",
    "app/api/admin/navigation/route.ts",
    "app/api/admin/marketing-ai-run/route.ts",
    "app/api/assistant/chat/route.ts",
    "app/api/agentic/run/route.ts",
  ].map(read).join("\n");
  assert.doesNotMatch(routeSources, /request\.json\(|await request\.text\(/);
  assert.match(routeSources, /readJsonObject|readBoundedText/);
});

test("verification and legacy permissions fail closed", () => {
  const delivery = read("app/lib/transactional-email.ts");
  const permissions = read("app/lib/site-admin.ts");
  const users = read("app/api/admin/site-users/route.ts");
  assert.match(delivery, /return \{ ok: false, configured: false \}/);
  assert.match(permissions, /LEGACY_EDITOR_PERMISSIONS/);
  assert.doesNotMatch(permissions, /row\.permissions_json == null\) \{\s*permissions = \[\.\.\.ADMIN_PERMISSIONS\]/);
  assert.match(users, /readiness\.turnstile\.ready/);
  assert.match(users, /provisioningAuthenticationConfigured/);
});

test("privileged writes and paid Marketing AI are atomic and reserved", () => {
  const workspace = read("app/api/admin/marketing-ai-workspace/route.ts");
  const drafts = read("app/api/admin/marketing-ai-drafts/route.ts");
  const run = read("app/api/admin/marketing-ai-run/route.ts");
  const migration = read("drizzle/0014_bent_starfox.sql");
  assert.match(workspace, /marketing_ai_record_atomic_write_failed/);
  assert.match(drafts, /marketing_ai_draft_atomic_write_failed/);
  assert.match(run, /reserveBudget/);
  assert.match(run, /status='settled'/);
  assert.match(run, /marketing_ai_failure_audit_unavailable/);
  assert.match(migration, /marketing_ai_budget_reservations/);
});

test("provisioning is idempotent and the shadow AI endpoint is private by default", () => {
  const subscriptions = read("app/lib/home-subscriptions.ts");
  const migration = read("drizzle/0013_fair_pride.sql");
  const agentic = read("app/api/agentic/run/route.ts");
  assert.match(subscriptions, /idempotencyKey = `payment:/);
  assert.match(subscriptions, /INSERT OR IGNORE INTO site_user_provisioning_outbox/);
  assert.match(migration, /idempotency_key/);
  assert.match(agentic, /ENABLE_AGENTIC_SHADOW/);
  assert.match(agentic, /getAdminSession/);
  assert.match(agentic, /if \(!auditRecorded\).*503/);
});

test("web responses, social redirects and bootstrap controls preserve the hardened contract", () => {
  const worker = read("worker/index.ts");
  const social = read("app/api/admin/social-content/route.ts");
  const packageHtml = read("public/package-admin.html");
  assert.match(worker, /Content-Security-Policy-Report-Only/);
  assert.match(worker, /Permissions-Policy/);
  assert.match(social, /redirect:'manual'/);
  assert.match(social, /UNSAFE_REDIRECT/);
  assert.match(packageHtml, /id="previous"[^>]+>Өмнөх<\/button>/);
});

test("release registry makes the remediation contract durable", () => {
  const registry = JSON.parse(read("APPROVED-FEATURES.json"));
  const release = registry.features.find((feature) => feature.id === "V80-AUDIT-REMEDIATION");
  assert.ok(release);
  assert.ok(release.mustPreserve.includes("atomic entity revision and audit writes"));
  assert.ok(release.mustPreserve.includes("bounded JSON request streams"));
});
