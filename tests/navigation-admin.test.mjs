import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function defaultNavigation() {
  const source = read("app/lib/navigation.ts");
  const start = source.indexOf("export const DEFAULT_NAVIGATION: NavigationConfig = ") + "export const DEFAULT_NAVIGATION: NavigationConfig = ".length;
  const end = source.indexOf(";\n\nconst ICONS", start);
  return JSON.parse(source.slice(start, end));
}

test("the header administrator starts with the exact five existing menus", () => {
  const defaults = defaultNavigation();
  assert.deepEqual(defaults.menus.map((menu) => menu.id), ["product", "solution", "industry", "ai", "intro"]);
  assert.deepEqual(defaults.menus.map((menu) => menu.labelMn), ["Бүтээгдэхүүн", "Шийдэл", "Салбар", "AI хөгжүүлэлт", "Танилцуулга"]);
  assert.ok(defaults.menus.every((menu) => menu.groups.length && menu.groups.every((group) => group.items.length)));
  assert.ok(defaults.menus.every((menu) => menu.groups.flatMap((group) => group.items).every((item) => item.icon)));
  assert.doesNotMatch(JSON.stringify(defaults), /Үнэ|Pricing|iBeX орчин|iBeX environment/);
});

test("the stored defaults match the currently rendered MN and EN content", () => {
  const context = vm.createContext({});
  const concept = read("public/concept.html");
  vm.runInContext(concept.slice(concept.indexOf("const headerMenus="), concept.indexOf("const megaMenu=")), context);
  const current = vm.runInContext("({mn:headerMenus,en:headerMenusEN,experience:menuExperience})", context);
  for (const menu of defaultNavigation().menus) {
    assert.equal(menu.titleMn, current.mn[menu.id].t);
    assert.equal(menu.titleEn, current.en[menu.id].t);
    assert.equal(menu.groups.length, current.mn[menu.id].groups.length);
    assert.deepEqual(menu.groups.map((group) => group.items.length), Array.from(current.mn[menu.id].groups, (group) => group.items.length));
    assert.equal(menu.feature.ctaMn, current.experience.mn[menu.id].c);
    assert.equal(menu.feature.ctaEn, current.experience.en[menu.id].c);
  }
});

test("one admin hub tab contains five sub-tabs and preserves existing sections", () => {
  const hub = read("app/admin/page.tsx"), editor = read("app/admin/navigation/page.tsx"), css = read("app/post-v30-admin.css");
  assert.equal((hub.match(/id: "navigation"/g) || []).length, 1);
  for (const id of ["product", "solution", "industry", "ai", "intro"]) assert.match(read("app/lib/navigation.ts"), new RegExp(`"${id}"`));
  for (const existing of ["partners", "people", "pricing", "knowledge", "social"]) assert.match(hub, new RegExp(`id: "${existing}"`));
  assert.match(editor, /Ноорог хадгалах/);
  assert.match(editor, /Нийтлэх/);
  assert.match(editor, /Урьдчилан харах/);
  assert.match(css, /navigation-admin-page[^}]+overflow:auto/);
  assert.match(css, /navigation-field-grid textarea\{min-height:96px[^}]+resize:vertical/);
});

test("public navigation keeps the existing renderer and safe fallback", () => {
  const publicApi = read("app/api/content/route.ts"), concept = read("public/concept.html"), adapter = read("public/navigation-content.js");
  assert.match(publicApi, /if \(!content\.navigation\) content\.navigation = cloneDefaultNavigation\(\)/);
  assert.match(concept, /<script src="\/navigation-content\.js"><\/script>/);
  assert.match(adapter, /navigationBaseIcon=ibexMenuIcon/);
  assert.match(adapter, /trigger\.hidden=menu\.enabled===false/);
  assert.match(adapter, /window\.open\(href,'_blank','noopener,noreferrer'\)/);
});
