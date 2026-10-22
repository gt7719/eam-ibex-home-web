import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { resetPasswordWithToken } from "../app/lib/account-token.ts";
import { chatSessionId } from "../app/lib/chat-session-id.ts";
import { monthEnd } from "../app/lib/calendar.ts";
import { marketingDecisionFields } from "../app/lib/marketing-ai-workspace.ts";
import { homeAiCustomerMessage, homeAiOpenAiMessage } from "../app/lib/home-ai-openai.ts";
import { apiMessage } from "../app/lib/api-message.ts";

function sqlite() {
  const sql = new DatabaseSync(":memory:");
  const wrap = (query, values = []) => ({
    bind: (...args) => wrap(query, args),
    first: async () => sql.prepare(query).get(...values) || null,
    all: async () => ({ results: sql.prepare(query).all(...values) }),
    run: async () => ({ meta: { changes: Number(sql.prepare(query).run(...values).changes) } }),
    query, values,
  });
  return { sql, prepare: wrap, batch: async (statements) => {
    sql.exec("BEGIN");
    try {
      const result = statements.map(s => ({ meta: { changes: Number(sql.prepare(s.query).run(...s.values).changes) } }));
      sql.exec("COMMIT"); return result;
    } catch (error) { sql.exec("ROLLBACK"); throw error; }
  } };
}

function resetDatabase() {
  const db = sqlite();
  db.sql.exec(`CREATE TABLE site_users(id TEXT PRIMARY KEY,password_hash TEXT CHECK(password_hash!='invalid'),password_salt TEXT,updated_at TEXT);
    CREATE TABLE site_user_tokens(id TEXT PRIMARY KEY,user_id TEXT,purpose TEXT,status TEXT,expires_at TEXT,used_at TEXT);
    CREATE TABLE site_user_sessions(user_id TEXT,status TEXT,revoked_at TEXT);
    INSERT INTO site_users VALUES('u','old','salt','before');
    INSERT INTO site_user_tokens VALUES('t','u','password_reset','pending','2027-01-01',NULL);
    INSERT INTO site_user_tokens VALUES('other','u','password_reset','pending','2027-01-01',NULL);
    INSERT INTO site_user_sessions VALUES('u','active',NULL);`);
  return db;
}

test("a password reset token has one winner after competing callers read pending", async () => {
  const db = resetDatabase();
  try {
    const input = { tokenId: "t", userId: "u", salt: "salt", now: "2026-10-22T00:00:00.000Z" };
    const result = await Promise.all([resetPasswordWithToken(db, { ...input, hash: "first" }), resetPasswordWithToken(db, { ...input, hash: "second" })]);
    assert.deepEqual(result, [true, false]);
    assert.equal(db.sql.prepare("SELECT password_hash FROM site_users").get().password_hash, "first");
    assert.equal(db.sql.prepare("SELECT status FROM site_user_tokens WHERE id='t'").get().status, "used");
    assert.equal(db.sql.prepare("SELECT status FROM site_user_tokens WHERE id='other'").get().status, "invalidated");
    assert.equal(db.sql.prepare("SELECT status FROM site_user_sessions").get().status, "password_changed");
  } finally { db.sql.close(); }
});

test("credential failure rolls the token claim back; expired tokens cannot reset", async () => {
  const db = resetDatabase();
  try {
    const input = { tokenId: "t", userId: "u", salt: "salt", now: "2026-10-22T00:00:00.000Z" };
    await assert.rejects(resetPasswordWithToken(db, { ...input, hash: "invalid" }));
    assert.equal(db.sql.prepare("SELECT status FROM site_user_tokens WHERE id='t'").get().status, "pending");
    assert.equal(await resetPasswordWithToken(db, { ...input, hash: "new", now: "2027-02-01T00:00:00.000Z" }), false);
    assert.equal(db.sql.prepare("SELECT password_hash FROM site_users").get().password_hash, "old");
  } finally { db.sql.close(); }
});

test("calendar terms clamp month ends, leap days and preserve UTC time", () => {
  for (const [start, months, expected] of [
    ["2027-01-31T12:30:00.000Z",1,"2027-02-28T12:30:00.000Z"],
    ["2028-01-31T12:30:00.000Z",1,"2028-02-29T12:30:00.000Z"],
    ["2028-02-29T12:30:00.000Z",12,"2029-02-28T12:30:00.000Z"],
    ["2026-08-31T12:30:00.000Z",1,"2026-09-30T12:30:00.000Z"],
  ]) assert.equal(monthEnd(new Date(start), months), expected);
});

test("channel checks and dry runs preserve the original approval provenance", () => {
  const current = { approved_by: "approver", approved_at: "approved-time", published_at: null, archived_at: null };
  for (const action of ["verify", "test"]) assert.deepEqual(marketingDecisionFields(current,"approved",action,"tester","now"), {
    approvedBy: "approver", approvedAt: "approved-time", publishedAt: null, archivedAt: null,
  });
  assert.equal(marketingDecisionFields(current,"approved","approve","new-approver","now").approvedBy,"new-approver");
  assert.equal(marketingDecisionFields(current,"draft","return_to_draft","tester","now").approvedBy,null);
});

test("customer errors are friendly in both languages while administrator diagnostics remain useful", () => {
  for (const lang of ["mn","en"]) for (const code of ["OPENAI_AUTH_ERROR","PROMPT_NOT_FOUND","OUTPUT_INCOMPLETE","OPENAI_TIMEOUT"]) {
    const text = homeAiCustomerMessage(lang, code);
    assert.doesNotMatch(text, /OpenAI|API|key|token|JSON|prompt|server|production/i);
    assert.ok(text.length > 30);
  }
  assert.match(homeAiOpenAiMessage("OPENAI_AUTH_ERROR","en"), /server secret/);
  assert.equal(apiMessage("Нэвтрэх мэдээлэл буруу байна.","en"), "The email or password is incorrect.");
  assert.doesNotMatch(apiMessage("Шинэ серверийн алдаа","en"), /[А-Яа-яӨөҮү]/);
  assert.doesNotMatch(apiMessage("SQL constraint database detail","en"), /SQL|constraint|database/);
});

const retentionSource = await readFile(new URL("../app/lib/data-retention.ts",import.meta.url),"utf8");
const compiledRetention = ts.transpileModule(retentionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
  .replace('"./home-ai-control"',JSON.stringify(new URL("../app/lib/home-ai-control.ts",import.meta.url).href));
const { runDataRetention } = await import(`data:text/javascript,${encodeURIComponent(compiledRetention)}`);

function retentionDatabase() {
  const db = sqlite();
  db.sql.exec(`CREATE TABLE site_content(key TEXT,value_json TEXT,updated_at TEXT,updated_by TEXT);
    CREATE TABLE site_users(id TEXT,account_status TEXT,deletion_requested_at TEXT);
    CREATE TABLE site_user_profile_images(user_id TEXT,object_key TEXT);
    CREATE TABLE customer_ai_messages(user_id TEXT,created_at TEXT);
    CREATE TABLE site_user_subscriptions(id TEXT,user_id TEXT);
    CREATE TABLE site_user_provisioning_outbox(subscription_id TEXT);
    INSERT INTO site_users VALUES('due','deletion_requested','2026-08-01'),('active','active',NULL);
    INSERT INTO site_user_profile_images VALUES('due','private/due.png'),('active','private/active.png');
    INSERT INTO customer_ai_messages VALUES('inactive','2025-01-01'),('active','2026-10-21'),('due','2026-10-21');`);
  for (const table of ["site_user_sessions","site_user_tokens","site_user_consents","auth_delivery_events","site_user_sms_verifications","site_user_access_requests","site_user_subscription_events"]) db.sql.exec(`CREATE TABLE ${table}(user_id TEXT)`);
  return db;
}

test("global retention removes inactive users' expired chat and due profile objects only", async () => {
  const db = retentionDatabase(), deleted = [];
  try {
    const result = await runDataRetention({ DB: db, BUCKET: { delete: async key => deleted.push(key) } },new Date("2026-10-22T00:00:00Z"));
    assert.equal(result.purged,1); assert.deepEqual(deleted,["private/due.png"]);
    assert.deepEqual(db.sql.prepare("SELECT id FROM site_users").all().map(x=>x.id),["active"]);
    assert.deepEqual(db.sql.prepare("SELECT user_id FROM customer_ai_messages").all().map(x=>x.user_id),["active"]);
    assert.equal(db.sql.prepare("SELECT COUNT(*) AS n FROM site_user_profile_images").get().n,1);
  } finally { db.sql.close(); }
});

test("storage failure keeps the account and object pointer for a later cleanup retry", async () => {
  const db = retentionDatabase();
  try {
    await assert.rejects(runDataRetention({ DB: db, BUCKET: { delete: async () => { throw new Error("storage offline"); } } },new Date("2026-10-22T00:00:00Z")));
    assert.equal(db.sql.prepare("SELECT COUNT(*) AS n FROM site_users WHERE id='due'").get().n,1);
    assert.equal(db.sql.prepare("SELECT object_key FROM site_user_profile_images WHERE user_id='due'").get().object_key,"private/due.png");
  } finally { db.sql.close(); }
});

test("anonymous Home AI requests are rejected before settings or paid model access", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js",import.meta.url).href);
  const response = await worker.fetch(new Request("http://localhost/api/assistant/chat", {
    method:"POST",headers:{"Content-Type":"application/json","Origin":"http://localhost"},
    body:JSON.stringify({message:"What is iBeX?",lang:"en",consent:true,sessionId:"anonymous-test-123456789",history:[]}),
  }),{ ASSETS:{fetch:async()=>new Response(null,{status:404})} },{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,401); assert.equal((await response.json()).code,"AUTH_REQUIRED");
});

test("HTTP browser chat correlation does not require secure-context randomUUID", () => {
  const random = { getRandomValues: array => { array.fill(7); return array; } };
  assert.match(chatSessionId(random), /^account-[a-f0-9]{32}$/);
});
