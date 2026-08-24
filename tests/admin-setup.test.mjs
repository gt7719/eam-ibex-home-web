import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("admin-setup-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function createDatabase({ failBatch = false } = {}) {
  const batches = [];
  const prepare = (sql) => {
    const statement = {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (sql.includes("COUNT(*)")) return { total: 0 };
        return null;
      },
      async run() {
        return { success: true };
      },
    };
    return statement;
  };
  return {
    batches,
    prepare,
    async batch(statements) {
      batches.push(statements);
      if (failBatch) throw new Error("simulated D1 batch failure");
      return statements.map(() => ({ success: true }));
    },
  };
}

function request() {
  return new Request("http://localhost/api/admin/setup", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "oai-authenticated-user-email": "owner@example.com",
      "oai-authenticated-user-full-name": encodeURIComponent("Site Owner"),
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
    body: JSON.stringify({
      email: "owner@example.com",
      name: "Site Owner",
      password: "strong-test-password",
    }),
  });
}

function runtime(database) {
  return {
    env: {
      DB: database,
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    ctx: { waitUntil() {}, passThroughOnException() {} },
  };
}

test("creates the initial administrator and session in one atomic D1 batch", { concurrency: false }, async () => {
  const worker = await loadWorker();
  const database = createDatabase();
  const { env, ctx } = runtime(database);
  globalThis.__CLOUDFLARE_TEST_ENV__ = env;
  const response = await worker.fetch(request(), env, ctx).finally(() => {
    delete globalThis.__CLOUDFLARE_TEST_ENV__;
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { created: true, authenticated: true });
  assert.match(response.headers.get("set-cookie") ?? "", /ibex_site_session=/);
  assert.equal(database.batches.length, 1);
  assert.equal(database.batches[0].length, 3);
  assert.match(database.batches[0][1].sql, /INSERT INTO admin_users/);
  assert.match(database.batches[0][2].sql, /INSERT INTO admin_sessions/);
});

test("returns a traceable persistence error without creating a partial account", { concurrency: false }, async () => {
  const worker = await loadWorker();
  const database = createDatabase({ failBatch: true });
  const { env, ctx } = runtime(database);
  globalThis.__CLOUDFLARE_TEST_ENV__ = env;
  const response = await worker.fetch(request(), env, ctx).finally(() => {
    delete globalThis.__CLOUDFLARE_TEST_ENV__;
  });
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.code, "ADMIN_SETUP_PERSISTENCE_FAILED");
  assert.match(payload.requestId, /^[0-9a-f-]{36}$/i);
  assert.match(payload.error, new RegExp(payload.requestId));
  assert.equal(database.batches.length, 1);
});
