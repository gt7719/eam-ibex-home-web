import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 54 lays out protected environments as extensible peer cards with statuses", () => {
  const concept = read("public/concept.html");
  const adapter = read("public/navigation-content.js");
  assert.match(concept, /mega-grid\.environment\{--cols:2\}/);
  assert.match(concept, /\{t:'Веб орчин',items:\[\['iBeX веб орчин'/);
  assert.match(concept, /\{t:'Мобайл орчин',items:\[\['iBeX мобайл орчин'/);
  assert.match(concept, /status:'active'/);
  assert.match(concept, /status:'development'/);
  assert.match(adapter, /configuredEnvironmentStatus/);
  assert.match(adapter, /ОДОО АШИГЛАЖ БАЙНА/);
  assert.match(adapter, /ХӨГЖҮҮЛЭГДЭЖ БАЙНА/);
});

test("version 54 labels the mobile environment as in development with safe exits", () => {
  const page = read("app/mobile/page.tsx");
  assert.match(page, /iBeX мобайл орчин хөгжүүлэгдэж байна/);
  assert.match(page, /мобайл үйлдлүүд идэвхжээгүй/);
  assert.match(page, /Нүүр хуудас руу буцах/);
  assert.match(page, /iBeX веб орчинд нэвтрэх/);
});

test("version 54 admin sign-in follows the global theme and exposes a close control", () => {
  const page = read("app/admin/login/page.tsx");
  const css = read("app/post-v30-admin.css");
  assert.match(page, /document\.documentElement\.dataset\.ibexTheme = next/);
  assert.match(page, /localStorage\.setItem\("ibex-theme", next\)/);
  assert.match(page, /className="admin-auth-controls"/);
  assert.match(page, /Админ нэвтрэлтийг хааж нүүр хуудас руу буцах/);
  assert.match(css, /data-ibex-theme="day"\] \.admin-auth-page/);
  assert.match(css, /data-ibex-theme="day"\] \.admin-auth-card h1\{color:#2d2434\}/);
});

test("version 54 uses one regular-value typography contract across every header submenu", () => {
  const css = read("app/post-v30-admin.css");
  assert.match(css, /Version 54: one readable admin standard across themes and navigation tabs/);
  assert.match(css, /\.navigation-admin-page \.navigation-field-grid :is\(input,textarea,select\)/);
  assert.match(css, /font-weight:400!important/);
  assert.match(css, /\.navigation-admin-page \.navigation-group-card>summary>strong/);
});

test("version 54 makes the new-menu control clear and reports active and total limits", () => {
  const page = read("app/admin/navigation/page.tsx");
  const css = read("app/post-v30-admin.css");
  assert.match(page, /Шинэ үндсэн цэс нэмэх/);
  assert.match(page, /disabled=\{atMenuLimit\}/);
  assert.match(page, /Идэвхтэй \$\{activeMenus\.length\} · Нийт \$\{totalMenuCount\}/);
  assert.match(css, /data-ibex-theme="day"\] \.navigation-admin-page \.navigation-add-menu\{border-color:#3e9d6c!important/);
  assert.match(css, /\.admin-session-bar\{border:1px[^}]+border-radius:18px/);
});
