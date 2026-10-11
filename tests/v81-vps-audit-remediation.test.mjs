import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import ts from "typescript";

const root = new URL("..", import.meta.url).pathname;
const directory = await mkdtemp(join(root, ".sites-runtime/tmp/v81-test-"));
const read = (name) => readFile(join(root, name), "utf8");
async function compile(name, source = undefined) {
  const result = ts.transpileModule(source ?? await read(name), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const path = join(directory, name.split("/").pop().replace(/\.ts$/, ".mjs"));
  await writeFile(path, result);
  return import(pathToFileURL(path).href);
}
after(async () => rm(directory, { recursive: true, force: true }));

const { S3ObjectStorage } = await compile("app/runtime/s3-storage.ts");
const { previewAccessResponse, protectedEnvironment, withSecurityHeaders } = await compile("app/runtime/web-security.ts");

function database(config, allowed = 0, fail = false) {
  return { DB: { prepare() {
    if (fail) throw new Error("synthetic DB outage");
    return { bind() { return this; }, first: async () => allowed === null
      ? null : config === undefined ? { allowed } : { value_json: JSON.stringify(config) } };
  } } };
}
function previewDatabase(visible, allowed = 0) {
  return { DB: { prepare(sql) {
    return { bind() { return this; }, first: async () => sql.includes("site_content")
      ? { value_json: JSON.stringify({ environments: [{ id: "mobile", visible }, { id: "web", visible }] }) }
      : allowed ? { allowed } : null };
  } } };
}

test("VPS preview gate preserves visibility and requires a verified session for hidden previews", async () => {
  const request = (path, cookie = "") => new Request(`https://home.invalid${path}`, { headers: { cookie } });
  assert.equal(await previewAccessResponse(request("/"), database(undefined, 0, true)), null);
  for (const path of ["/organization-preview.html", "/mobile-preview", "/mobile-preview/index.html", "/mobile-preview/app.js", "/mobile-preview/%69ndex.html"]) {
    assert.equal(await previewAccessResponse(request(path), previewDatabase(true)), null);
    assert.equal((await previewAccessResponse(request(path), previewDatabase(false))).status, 404);
    assert.equal((await previewAccessResponse(request(`${path}?adminPreview=1`), previewDatabase(false))).status, 404);
    assert.equal((await previewAccessResponse(request(`${path}?adminPreview=1`, "ibex_site_session=invalid"), previewDatabase(false))).status, 404);
    assert.equal(await previewAccessResponse(request(`${path}?adminPreview=1`, "ibex_site_session=valid"), previewDatabase(false, 1)), null);
  }
  assert.equal(protectedEnvironment("/%6dobile-preview/index.html"), "mobile");
  // A valid administrator's CSS/JS request has no adminPreview query flag.
  assert.equal(await previewAccessResponse(request("/mobile-preview/styles.css", "ibex_site_session=valid"), previewDatabase(false, 1)), null);
  assert.equal((await previewAccessResponse(request("/mobile-preview/%69ndex.html", "ibex_site_session=valid"), previewDatabase(false, 1))).status, 404);
  assert.equal((await previewAccessResponse(request("/mobile-preview/index.html"), database(undefined, 0, true))).status, 503);
  const response = withSecurityHeaders(new Response("x", { status: 401 }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(response.headers.get("permissions-policy"));
  assert.ok(response.headers.get("content-security-policy-report-only"));
});

test("exact S3 adapter uploads a file stream and distinguishes missing objects from missing buckets", async () => {
  const received = [];
  const server = createServer(async (request, response) => {
    if (request.method === "PUT") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      received.push({ headers: request.headers, body: Buffer.concat(chunks).toString() });
      response.setHeader("etag", '"synthetic"'); response.end(); return;
    }
    if (request.url.startsWith("/missing-bucket")) {
      response.writeHead(404, { "content-type": "application/xml" });
      response.end(request.method === "HEAD" ? "" : "<Error><Code>NoSuchBucket</Code><Message>missing</Message></Error>"); return;
    }
    if (request.method === "HEAD") { response.end(); return; }
    response.writeHead(404, { "content-type": "application/xml" });
    response.end("<Error><Code>NoSuchKey</Code><Message>missing</Message></Error>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const config = { endpoint: `http://127.0.0.1:${server.address().port}`, region: "us-east-1", bucket: "ibex-probe", accessKeyId: "synthetic", secretAccessKey: "synthetic", forcePathStyle: true };
  const store = new S3ObjectStorage(config);
  try {
    const file = new File(["synthetic upload bytes"], "зураг.png", { type: "image/png" });
    await store.put("probe", file.stream(), { contentLength: file.size, customMetadata: { originalName: file.name }, httpMetadata: { contentType: file.type } });
    assert.equal(received.length, 1);
    assert.equal(Number(received[0].headers["x-amz-decoded-content-length"] ?? received[0].headers["content-length"]), file.size);
    assert.ok(received[0].body.includes("synthetic upload bytes"));
    assert.equal(received[0].headers["x-amz-meta-originalname"], encodeURIComponent(file.name));
    await assert.rejects(store.put("no-length", file.stream()), /contentLength/);
    await store.checkReadiness();
    assert.equal(await store.get("absent"), null);
    const missing = new S3ObjectStorage({ ...config, bucket: "missing-bucket" });
    await assert.rejects(missing.checkReadiness());
    await assert.rejects(missing.get("probe"), (error) => error.name === "NoSuchBucket");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function keyFunctions(file, name) {
  // Execute the production pure functions; avoid loading persistence modules.
  const source = await read(file), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest);
  const functions = ast.statements.filter((statement) => ts.isFunctionDeclaration(statement) && ["bytesToHex", "digest", name].includes(statement.name?.text));
  assert.ok(functions.length >= 2);
  return compile(file, functions.map((statement) => statement.getText(ast)).join("\n"));
}

test("forged IP headers and network changes cannot reset either authentication limit", async () => {
  const { loginAttemptKey } = await keyFunctions("app/lib/admin-security.ts", "loginAttemptKey");
  const { actionAttemptKey } = await keyFunctions("app/lib/site-user-auth.ts", "actionAttemptKey");
  const a = new Request("https://home.invalid", { headers: { "cf-connecting-ip": "192.0.2.1", "x-forwarded-for": "192.0.2.2" } });
  const b = new Request("https://home.invalid", { headers: { "cf-connecting-ip": "198.51.100.1", "x-forwarded-for": "198.51.100.2" } });
  assert.equal(await loginAttemptKey(a, "TEST@invalid.test"), await loginAttemptKey(b, "test@invalid.test"));
  assert.equal(await actionAttemptKey(a, "login", "test@invalid.test"), await actionAttemptKey(b, "login", "TEST@invalid.test"));
  assert.notEqual(await actionAttemptKey(a, "login", "test@invalid.test"), await actionAttemptKey(a, "register", "test@invalid.test"));
  assert.notEqual(await loginAttemptKey(a, "one@invalid.test"), await loginAttemptKey(a, "two@invalid.test"));
});

test("readiness uses a bucket check and rejects missing application schema", async () => {
  const fixture = {
    DB: { prepare(sql) { return { first: async () => ({ ready: 1 }), run: async () => {
      assert.ok(sql.includes("site_users"));
      if (fixture.schemaMissing) throw new Error("synthetic missing schema");
    } }; } },
    BUCKET: { checkReadiness: async () => { if (fixture.bucketMissing) throw new Error("synthetic NoSuchBucket"); },
      get: async () => { throw new Error("Node readiness must not use a missing-key probe"); } },
    schemaMissing: false, bucketMissing: false,
  };
  globalThis.__V81_READY_ENV__ = fixture;
  try {
    const source = (await read("app/api/ready/route.ts")).replace(/import \{ env \} from [^;]+;/, "const env = globalThis.__V81_READY_ENV__;");
    const { GET } = await compile("app/api/ready/route.ts", source);
    assert.equal((await GET()).status, 200);
    fixture.bucketMissing = true;
    assert.equal((await GET()).status, 503);
    fixture.bucketMissing = false; fixture.schemaMissing = true;
    assert.equal((await GET()).status, 503);
  } finally { delete globalThis.__V81_READY_ENV__; }
});
