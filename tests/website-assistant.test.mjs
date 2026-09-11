import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("website assistant stays separate from iBeX System AI and live tenant data", () => {
  const knowledge = read("app/lib/assistant-knowledge.ts");
  const route = read("app/api/assistant/chat/route.ts");
  assert.match(knowledge, /iBeX System AI-аас бүрэн тусдаа/);
  assert.match(knowledge, /PostgreSQL, Directus, байгууллагын tenant өгөгдөл/);
  assert.match(route, /entry\.status === "approved" && entry\.visibility === "public"/);
  assert.match(route, /entry\.enabled/);
  assert.match(route, /Баталгаажсан материалд|баталгаажсан, нийтэд нээлттэй/i);
});

test("assistant UI is bilingual, cites sources and is wired into the public site", () => {
  const html = read("public/concept.html");
  const widget = read("public/assistant-widget.js");
  assert.match(html, /assistant-widget\.css/);
  assert.match(html, /assistant-widget\.js/);
  assert.match(widget, /iBeX мэдээллийн туслах/);
  assert.match(widget, /iBeX Website Assistant/);
  assert.match(widget, /assistant-sources/);
  assert.match(widget, /\/api\/assistant\/chat/);
  assert.match(widget, /get\('admin'\)===\s*'1'\)return/);
  assert.doesNotMatch(widget, /PM ба PdM ямар ялгаатай вэ\?|How do PM and PdM differ\?/);
});

test("mobile assistant remains above the embedded admin overlay and inside device safe areas", () => {
  const assistant = read("public/assistant-widget.css");
  const hub = read("public/admin-hub.css");
  assert.match(assistant, /\.ibex-assistant\s*\{[^}]*z-index:\s*9200/s);
  assert.match(assistant, /100dvh/);
  for (const edge of ["top", "right", "bottom", "left"])
    assert.match(assistant, new RegExp(`safe-area-inset-${edge}`));
  assert.match(hub, /\.embedded-admin-hub\s+\.ibex-assistant\s*\{[^}]*z-index:\s*9200/s);
  assert.doesNotMatch(hub, /#assistantWidget\s*\{[^}]*display:\s*none/s);
});

test("the approved Mongolian iBeX book is indexed as a public assistant source", () => {
  const route = read("app/api/assistant/chat/route.ts");
  const book = JSON.parse(read("app/lib/ibex-book-knowledge.json"));
  assert.match(route, /ibex-book-knowledge\.json/);
  assert.ok(book.length >= 400);
  assert.ok(book.some((entry) => /БҮЛЭГ 40/i.test(`${entry.titleMn} ${entry.sourceLabel}`)));
  assert.ok(book.every((entry) => entry.status === "approved" && entry.visibility === "public" && entry.enabled));
});

test("admin chrome reserves its own row instead of covering the workspace", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.admin-workspace\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:/s);
  const sessionBar = css.match(/\.admin-session-bar\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(sessionBar, /position:\s*relative/);
  assert.doesNotMatch(sessionBar, /position:\s*fixed|(?:^|[;\s])bottom\s*:/m);
});

test("knowledge administration has independent permission and governance controls", () => {
  const permissions = read("app/lib/site-admin.ts");
  const page = read("app/admin/assistant/page.tsx");
  const api = read("app/api/admin/assistant-knowledge/route.ts");
  assert.match(permissions, /"knowledge\.manage"/);
  assert.match(api, /hasAdminPermission\(user, "knowledge\.manage"\)/);
  for (const value of ["draft", "approved", "archived", "public", "internal", "restricted", "implemented", "pilot", "rnd", "future"]) {
    assert.match(page, new RegExp(`value=\\"${value}\\"`));
  }
});
