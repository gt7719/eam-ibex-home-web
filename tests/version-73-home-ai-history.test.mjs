import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("signed-in Home AI history is stored per user and can only be cleared by that user", async () => {
  const schema = await read("db/schema.ts");
  const migration = await read("drizzle/0010_chemical_tigra.sql");
  const history = await read("app/lib/home-ai-history.ts");
  const route = await read("app/api/account/home-ai-history/route.ts");

  assert.match(schema, /customerAiMessages = sqliteTable\(\s*"customer_ai_messages"/s);
  assert.match(migration, /CREATE TABLE `customer_ai_messages`/);
  assert.match(migration, /`user_id` text NOT NULL/);
  assert.match(history, /WHERE user_id=\?/);
  assert.match(history, /DELETE FROM customer_ai_messages WHERE user_id=\?/);
  assert.match(route, /const user = await getSiteUserSession\(\)/);
  assert.match(route, /readHomeAiHistory\(env\.DB, user\.id, settings\.historyRetentionDays\)/);
  assert.match(route, /clearHomeAiHistory\(env\.DB, user\.id\)/);
  assert.match(route, /hasTrustedOrigin\(request\)/);
});

test("Home AI restores server history and clears it only after explicit confirmation", async () => {
  const drawer = await read("app/components/home-ai-drawer.tsx");

  assert.match(drawer, /fetch\("\/api\/account\/home-ai-history", \{ cache: "no-store" \}\)/);
  assert.match(drawer, /setMessages\(payload\.messages\.filter/);
  assert.match(drawer, /window\.confirm\(t\("Home AI-ийн ярианы түүхийг цэвэрлэж/);
  assert.match(drawer, /fetch\("\/api\/account\/home-ai-history", \{ method: "DELETE" \}\)/);
  assert.match(drawer, /setMessages\(\[\]\)/);
  assert.doesNotMatch(drawer, /localStorage|sessionStorage/);
});

test("successful OpenAI responses are persisted while quota notices remain friendly", async () => {
  const route = await read("app/api/assistant/chat/route.ts");
  const quota = await read("app/lib/customer-ai.ts");

  assert.match(route, /saveHomeAiExchange/);
  assert.match(route, /answer = generated\.answer;[\s\S]*await persistExchange/);
  assert.doesNotMatch(route, /status: "greeting"/);
  assert.match(route, /await persistExchange\(\{[\s\S]*question: parsed\.payload\.message,[\s\S]*answer,/);
  assert.match(route, /Өнөөдрийн Home AI ашиглах хязгаарт хүрлээ/);
  assert.match(route, /Энэ сарын Home AI ашиглах нөөцөд хүрлээ/);
  assert.match(quota, /secondsToNextDay/);
  assert.match(quota, /secondsToNextMonth/);
});

test("the privacy notice documents persistent history and explicit deletion", async () => {
  const privacy = await read("app/privacy/page.tsx");
  const auth = await read("app/lib/site-user-auth.ts");

  assert.match(auth, /PRIVACY_VERSION = "2026-09-v2"/);
  assert.match(privacy, /D1 санд тухайн хэрэглэгчийн бүртгэлтэй тусгаарлан/);
  assert.match(privacy, /«Түүх цэвэрлэх» үйлдлээр яриагаа хүссэн үедээ устгана/);
  assert.match(privacy, /store: false/);
});
