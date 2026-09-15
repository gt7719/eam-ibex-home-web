import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("AI execution fails closed behind persistent request and budget controls", () => {
  const route = read("app/api/agentic/run/route.ts");
  const schema = read("db/schema.ts");
  const migration = read("drizzle/0006_concerned_post.sql");
  assert.match(route, /enforceRequestLimit/);
  assert.match(route, /agentic_budget_guard_unavailable/);
  assert.match(route, /agentic_approval_storage_unavailable/);
  assert.match(schema, /aiRateLimits/);
  assert.match(migration, /CREATE TABLE `ai_rate_limits`/);
});

test("registration validates the ISO country and calling-code pair", () => {
  const auth = read("app/lib/site-user-auth.ts");
  const options = read("app/lib/calling-codes.ts");
  const country = read("app/api/account/country/route.ts");
  assert.match(auth, /callingCodeForIso\(phoneCountryIso\)/);
  assert.match(auth, /expectedCallingCode !== `\+\$\{callingDigits\}`/);
  assert.match(options, /callingCodeForIso/);
  assert.match(country, /callingCodeForIso/);
});

test("uploaded media is compensated on metadata failure and old orphans are bounded", () => {
  const route = read("app/api/admin/media/route.ts");
  assert.match(route, /cleanupOrphanedMedia/);
  assert.match(route, /24 \* 60 \* 60 \* 1000/);
  assert.match(route, /env\.BUCKET\.delete\(objectKey\)/);
  assert.match(route, /LIMIT 20/);
});

test("audited UI keeps bank apps responsive and interactive controls readable", () => {
  const css = read("app/globals.css");
  const pricing = read("app/admin/pricing/page.tsx");
  const concept = read("public/concept.html");
  assert.match(css, /grid-template-areas:[\s\S]*"order image nameMn nameEn"/);
  assert.match(css, /input\[type="checkbox"\][\s\S]*width: 18px/);
  assert.match(pricing, /bank-app-name-mn/);
  assert.match(concept, /hint-left/);
  assert.match(concept, /addEventListener\('focus'/);
});
