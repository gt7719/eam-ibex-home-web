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
