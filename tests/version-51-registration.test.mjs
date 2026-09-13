import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 51 removes fallback menu triggers before rebuilding managed navigation", () => {
  const adapter = read("public/navigation-content.js");
  assert.match(adapter, /querySelectorAll\('\.menu-trigger\[data-menu\]'\)/);
  assert.match(adapter, /if\(button!==pricingButton\)button\.closest\('\.navitem'\)\?\.remove\(\)/);
  assert.match(adapter, /preserving the protected Pricing and iBeX environment entries/);
});

test("version 51 exposes website registration without replacing core or admin sign-in", () => {
  const concept = read("public/concept.html");
  assert.match(concept, /id="webAccountLink" href="\/login"/);
  assert.match(concept, /id="webRegisterLink" href="\/register"/);
  assert.match(concept, /href="https:\/\/demo\.ibex\.mn"/);
  assert.match(concept, /href="\/admin\/login"/);
});

test("public website users are isolated from administrator and tenant identities", () => {
  const schema = read("db/schema.ts"), migration = read("drizzle/0004_absent_odin.sql");
  assert.match(schema, /separate from both admin_users/);
  assert.match(migration, /CREATE TABLE `site_users`/);
  assert.match(migration, /CREATE TABLE `site_user_sessions`/);
  assert.match(migration, /CREATE TABLE `site_user_tokens`/);
  assert.match(migration, /site_users_verified_phone_unique/);
  assert.match(migration, /WHERE "site_users"\."phone_status" = 'verified'/);
});

test("registration enforces password, phone and explicit policy consent", () => {
  const auth = read("app/lib/site-user-auth.ts"), route = read("app/api/account/register/route.ts");
  assert.match(auth, /password\.length < 12 \|\| password\.length > 128/);
  assert.match(auth, /\^\\\+\[1-9\]\\d\{7,14\}\$/);
  assert.match(auth, /termsAccepted !== true \|\| input\.privacyAccepted !== true/);
  assert.match(route, /marketingEmailOptIn/);
  assert.match(route, /marketingSmsOptIn/);
  assert.match(route, /phone_status.*'unverified'/s);
});

test("email and password tokens are one-time, hashed and time limited", () => {
  const auth = read("app/lib/site-user-auth.ts"), verify = read("app/api/account/verify-email/route.ts"), reset = read("app/api/account/reset-password/route.ts");
  assert.match(auth, /EMAIL_TOKEN_MAX_AGE_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(auth, /RESET_TOKEN_MAX_AGE_MS = 30 \* 60 \* 1000/);
  assert.match(verify, /token_hash=\?/);
  assert.match(verify, /status='used'/);
  assert.match(reset, /status='password_changed'/);
  assert.match(reset, /await digest\(body\.token\)/);
});

test("transactional delivery is provider-configurable and records failures", () => {
  const email = read("app/lib/transactional-email.ts"), security = read("app/components/turnstile-field.tsx"), config = read("app/api/account/security-config/route.ts");
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /no-reply@account\.ibex\.mn/);
  assert.match(email, /support@ibex\.mn/);
  assert.match(email, /provider_not_configured/);
  assert.match(email, /turnstile\/v0\/siteverify/);
  assert.match(security, /turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(security, /onReadyChange\(false\)/);
  assert.match(config, /TURNSTILE_SITE_KEY/);
  assert.match(config, /siteKey: enabled \? siteKey : null/);
});

test("registered-user administration is independently permission gated", () => {
  const security = read("app/lib/site-admin.ts"), route = read("app/api/admin/site-users/route.ts"), hub = read("app/admin/page.tsx");
  assert.match(security, /"accounts\.manage"/);
  assert.match(route, /hasAdminPermission\(user, "accounts\.manage"\)/);
  assert.match(route, /email_status !== "verified"/);
  assert.match(hub, /\/admin\/site-users\?embedded=1/);
});
