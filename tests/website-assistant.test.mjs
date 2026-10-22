import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("website assistant stays separate from iBeX System AI and live tenant data", () => {
  const knowledge = read("app/lib/assistant-knowledge.ts");
  const route = read("app/api/assistant/chat/route.ts");
  const customerAi = read("app/lib/customer-ai.ts");
  assert.match(knowledge, /iBeX System AI-аас бүрэн тусдаа/);
  assert.match(knowledge, /PostgreSQL, Directus, байгууллагын tenant өгөгдөл/);
  assert.match(customerAi, /entry\.enabled && entry\.status === "approved" && entry\.visibility === "public"/);
  assert.match(customerAi, /CUSTOMER_AI_DATA_BOUNDARY = "public-assistant-no-private-system-access"/);
  assert.match(route, /systemAiAccess: false/);
  assert.doesNotMatch(route, /Use only APPROVED EVIDENCE/);
});

test("Home AI is bilingual, supports references and is confined to signed-in accounts (V84)", () => {
  const html = read("public/concept.html");
  const drawer = read("app/components/home-ai-drawer.tsx");
  const account = read("app/account/page.tsx");
  assert.doesNotMatch(html, /assistant-widget\.(?:css|js)/);
  assert.match(account, /data \? <HomeAiDrawer/);
  assert.match(drawer, /YOUR DIGITAL ASSISTANT/);
  assert.match(drawer, /ТАНЫ ЦАХИМ ТУСЛАХ/);
  assert.match(drawer, /message\.sources/);
  assert.match(drawer, /\/api\/assistant\/chat/);
  assert.match(drawer, /consent: true/);
  assert.match(drawer, /Нууц мэдээллээ чатад бүү оруулаарай/);
});

test("Marketing AI is an administrator-only full module instead of a public chat identity", () => {
  const adminHub = read("app/admin/page.tsx");
  const permissions = read("app/lib/site-admin.ts");
  const marketing = read("app/admin/marketing-ai/page.tsx");
  const customerRoute = read("app/api/assistant/chat/route.ts");
  const homePrompt = read("app/lib/home-ai-prompt.ts");
  assert.match(adminHub, /marketing\.manage/);
  assert.match(permissions, /"marketing\.manage"/);
  for (const label of ["Хяналтын самбар", "AI командын төв", "Хэрэглэгч ба Lead", "Кампанит ажил", "Зөвшөөрлийн төв", "Төсөв ба хэрэглээ", "Audit log"]) {
    assert.match(marketing, new RegExp(label));
  }
  assert.match(marketing, /ЗӨВХӨН АДМИН/);
  assert.match(homePrompt, /public customer assistant/);
  assert.doesNotMatch(customerRoute, /public customer and marketing assistant/);
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

test("the approved Mongolian iBeX book remains separate from the public Home AI source channel", () => {
  const route = read("app/api/assistant/chat/route.ts");
  const book = JSON.parse(read("app/lib/ibex-book-knowledge.json"));
  assert.doesNotMatch(route, /ibex-book-knowledge\.json/);
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
