import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("administrator-managed navigation text is escaped before public HTML rendering", () => {
  const concept = read("public/concept.html");
  assert.match(concept, /<small>\$\{esc\(x\.e\)\}<\/small>/);
  assert.match(concept, /<h3><i><\/i>\$\{esc\(g\.t\)\}<\/h3>/);
  assert.match(concept, /<strong>\$\{esc\(x\[0\]\)\}<\/strong><small>\$\{esc\(x\[1\]\)\}<\/small>/);
  assert.match(concept, /<span>\$\{esc\(d\.foot\)\}<\/span>/);
});

test("navigation rejects protocol-relative external links", () => {
  const navigation = read("app/lib/navigation.ts");
  assert.match(navigation, /candidate\.startsWith\("\/"\) && !candidate\.startsWith\("\/\/"\)/);
});

test("uploaded SVG is disabled and media responses are sandboxed", () => {
  const upload = read("app/api/admin/media/route.ts");
  const media = read("app/api/media/[id]/route.ts");
  assert.doesNotMatch(upload, /"image\/svg\+xml",/);
  assert.match(upload, /matchesSignature\(file\.type, signature\)/);
  assert.match(media, /Content-Security-Policy/);
  assert.match(media, /X-Content-Type-Options/);
  assert.match(media, /application\/octet-stream/);
});

test("header menu media uses restricted uploads and safe public rendering", () => {
  const schema = read("app/lib/navigation.ts");
  const editor = read("app/admin/navigation/page.tsx");
  const adapter = read("public/navigation-content.js");
  const renderer = read("public/continuous-details.js");
  assert.match(schema, /safeMediaHref/);
  assert.match(schema, /\/api\\\/media/);
  assert.match(editor, /image\/png,image\/jpeg,image\/webp,image\/gif/);
  assert.match(editor, /video\/mp4,video\/webm/);
  assert.match(editor, /application\/pdf/);
  assert.match(adapter, /media:item\.media/);
  assert.match(renderer, /navigation-content-media/);
  assert.match(renderer, /rel="noopener noreferrer"/);
});

test("content and knowledge inputs receive server-side URL validation", () => {
  const content = read("app/api/admin/content/route.ts");
  const knowledge = read("app/api/admin/assistant-knowledge/route.ts");
  assert.match(content, /normalizePartners/);
  assert.match(content, /normalizePeople/);
  assert.match(knowledge, /safeHttpsUrl/);
});

test("every audited administrator mutation has a same-origin guard", () => {
  const routes = [
    "assistant-knowledge", "content", "login", "logout", "media", "navigation",
    "packages", "payment-settings", "setup", "social-content", "users",
  ];
  for (const route of routes) {
    const source = read(`app/api/admin/${route}/route.ts`);
    assert.match(source, /Origin mismatch/, `${route} must reject an untrusted origin`);
  }
});

test("login throttling and its migration remain part of the deployed schema", () => {
  const login = read("app/api/admin/login/route.ts");
  const migration = read("drizzle/0003_cooing_timeslip.sql");
  assert.match(login, /loginIsLocked/);
  assert.match(login, /recordLoginFailure/);
  assert.match(login, /status: throttle\.locked \? 429 : 401/);
  assert.match(migration, /CREATE TABLE `admin_login_attempts`/);
});

test("editable administrator surfaces warn before discarding local changes", () => {
  for (const path of [
    "app/admin/navigation/page.tsx", "app/admin/assistant/page.tsx",
    "app/admin/pricing/page.tsx", "app/admin/social/page.tsx", "public/concept.html",
  ]) assert.match(read(path), /beforeunload/, `${path} must preserve unsaved work`);
});
