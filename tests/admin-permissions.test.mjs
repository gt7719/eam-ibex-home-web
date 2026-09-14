import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("admin-permission-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function createDatabase({ role = "editor", permissions = [], targetRole = "editor" } = {}) {
  const batches = [];
  const runs = [];
  const prepare = (sql) => {
    const statement = {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (sql.includes("FROM admin_sessions")) {
          return {
            id: "session-user",
            email: "admin@example.com",
            name: "Permission Admin",
            role,
            permissions_json: JSON.stringify(permissions),
            status: "active",
            last_access: null,
          };
        }
        if (sql.includes("SELECT role FROM admin_users")) return { role: targetRole };
        return null;
      },
      async all() {
        if (sql.includes("FROM site_content")) return { results: [] };
        return { results: [] };
      },
      async run() {
        runs.push(this);
        return { success: true };
      },
    };
    return statement;
  };
  return {
    batches,
    runs,
    prepare,
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ success: true }));
    },
  };
}

function runtime(database) {
  return {
    env: {
      DB: database,
      BUCKET: { put: async () => {}, get: async () => null },
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    ctx: { waitUntil() {}, passThroughOnException() {} },
  };
}

function adminRequest(path, method, body) {
  const init = {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      cookie: "ibex_site_session=test-session-token",
    },
  };
  if (method !== "GET" && method !== "HEAD") init.body = JSON.stringify(body);
  return new Request(`http://localhost${path}`, init);
}

async function dispatch(database, request) {
  const worker = await loadWorker();
  const { env, ctx } = runtime(database);
  globalThis.__CLOUDFLARE_TEST_ENV__ = env;
  return worker.fetch(request, env, ctx).finally(() => {
    delete globalThis.__CLOUDFLARE_TEST_ENV__;
  });
}

test("denies pricing writes when the editor lacks pricing permission", { concurrency: false }, async () => {
  const database = createDatabase({ permissions: ["partners.manage"] });
  const response = await dispatch(
    database,
    adminRequest("/api/admin/content", "PUT", { pricing: [{ id: "free" }] }),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).deniedKey, "pricing");
  assert.equal(database.batches.length, 0);
});

test("launch offer requires login and pricing permission", { concurrency: false }, async () => {
  const database = createDatabase({ permissions: ["partners.manage"] });
  assert.equal((await dispatch(database, new Request("http://localhost/api/admin/launch-offer"))).status, 401);
  assert.equal((await dispatch(database, adminRequest("/api/admin/launch-offer", "PUT", {}))).status, 403);
  const allowed = createDatabase({ permissions: ["pricing.manage"] });
  const response = await dispatch(allowed, adminRequest("/api/admin/launch-offer", "GET"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).offer.enabled, false);
  assert.equal((await dispatch(allowed, adminRequest("/api/admin/launch-offer", "PUT", { revision: 0, offer: {} }))).status, 400);
});

test("allows only the content section assigned to the editor", { concurrency: false }, async () => {
  const database = createDatabase({ permissions: ["partners.manage"] });
  const response = await dispatch(
    database,
    adminRequest("/api/admin/content", "PUT", { partners: [{ id: "partner" }] }),
  );

  assert.equal(response.status, 200);
  assert.equal(database.batches.length, 1);
  assert.equal(database.batches[0].length, 1);
  assert.equal(database.batches[0][0].values[0], "partners");
});

test("lets the owner update an editor permission set", { concurrency: false }, async () => {
  const database = createDatabase({ role: "owner" });
  const response = await dispatch(
    database,
    adminRequest("/api/admin/users", "PATCH", {
      id: "editor-user",
      permissions: ["partners.manage", "media.upload"],
    }),
  );

  assert.equal(response.status, 200);
  const update = database.runs.find((statement) => statement.sql.includes("permissions_json"));
  assert.ok(update);
  assert.deepEqual(JSON.parse(update.values[0]), ["partners.manage", "media.upload"]);
});

test("lets an authorized content editor save a public event without a Facebook URL", { concurrency: false }, async () => {
  const database = createDatabase({ permissions: ["social.manage"] });
  const response = await dispatch(
    database,
    adminRequest("/api/admin/social-content", "PUT", {
      entries: [{
        id: "event-1", type: "event", titleMn: "Арга хэмжээ", titleEn: "Public event",
        startAt: "2026-09-10T09:00", status: "published", enabled: true,
        galleryUrls: ["https://example.com/one.jpg"], sortOrder: 3,
      }],
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.entries[0].type, "event");
  assert.equal(payload.entries[0].sourceUrl, "");
  assert.deepEqual(payload.entries[0].galleryUrls, ["https://example.com/one.jpg"]);
  const saved = database.runs.find((statement) => statement.sql.includes("INSERT INTO site_content"));
  assert.ok(saved);
  assert.equal(saved.values[0], "socialContent");
});

test("header navigation requires its own permission and publishes atomically", { concurrency: false }, async () => {
  const denied = createDatabase({ permissions: ["partners.manage"] });
  assert.equal((await dispatch(denied, adminRequest("/api/admin/navigation", "GET", {}))).status, 403);

  const allowed = createDatabase({ permissions: ["navigation.manage"] });
  const readResponse = await dispatch(allowed, adminRequest("/api/admin/navigation", "GET", {}));
  assert.equal(readResponse.status, 200);
  const navigation = (await readResponse.json()).draft;
  assert.deepEqual(navigation.menus.map((menu) => menu.id), ["product", "solution", "industry", "ai", "intro"]);
  assert.equal(navigation.environmentVisible, true);
  navigation.environmentVisible = false;

  const publishResponse = await dispatch(
    allowed,
    adminRequest("/api/admin/navigation", "PUT", { action: "publish", navigation }),
  );
  assert.equal(publishResponse.status, 200);
  assert.equal((await publishResponse.json()).navigation.environmentVisible, false);
  assert.equal(allowed.batches.length, 1);
  assert.deepEqual(allowed.batches[0].map((statement) => statement.values[0]), ["headerNavigationDraft", "headerNavigation"]);
});

test("header navigation accepts a complete custom menu and caps each gallery type", { concurrency: false }, async () => {
  const database = createDatabase({ permissions: ["navigation.manage"] });
  const readResponse = await dispatch(database, adminRequest("/api/admin/navigation", "GET", {}));
  const navigation = (await readResponse.json()).draft;
  const custom = structuredClone(navigation.menus[0]);
  custom.id = "customer-stories";
  custom.labelMn = "Туршлага";
  custom.labelEn = "Stories";
  custom.titleMn = "Хэрэглэгчийн туршлага";
  custom.titleEn = "Customer stories";
  custom.groups = [{
    id: "stories-group",
    titleMn: "Нэвтрүүлэлт",
    titleEn: "Implementations",
    enabled: true,
    items: [{
      ...custom.groups[0].items[0],
      id: "stories-item",
      bodyMn: "Монгол дэлгэрэнгүй агуулга",
      bodyEn: "English detailed content",
      media: [
        ...Array.from({ length: 11 }, (_, index) => ({ id: `image-${index}`, type: "image", url: `/api/media/image-${index}` })),
        ...Array.from({ length: 6 }, (_, index) => ({ id: `video-${index}`, type: "video", url: `/api/media/video-${index}` })),
        ...Array.from({ length: 6 }, (_, index) => ({ id: `pdf-${index}`, type: "pdf", url: `/api/media/pdf-${index}` })),
      ],
    }],
  }];
  navigation.menus.push(custom);
  const response = await dispatch(database, adminRequest("/api/admin/navigation", "PUT", { action: "publish", navigation }));
  assert.equal(response.status, 200);
  const saved = await response.json(), item = saved.navigation.menus.at(-1).groups[0].items[0];
  assert.equal(saved.navigation.menus.length, 6);
  assert.equal(item.bodyMn, "Монгол дэлгэрэнгүй агуулга");
  assert.equal(item.media.filter((row) => row.type === "image").length, 10);
  assert.equal(item.media.filter((row) => row.type === "video").length, 5);
  assert.equal(item.media.filter((row) => row.type === "pdf").length, 5);
});
