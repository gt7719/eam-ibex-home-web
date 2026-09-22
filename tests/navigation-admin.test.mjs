import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function defaultNavigation() {
  const source = read("app/lib/navigation.ts");
  const environmentStart = source.indexOf("export const DEFAULT_ENVIRONMENTS: EnvironmentConfig[] = ") + "export const DEFAULT_ENVIRONMENTS: EnvironmentConfig[] = ".length;
  const environmentEnd = source.indexOf(";\n\nexport const DEFAULT_NAVIGATION", environmentStart);
  const environments = vm.runInNewContext(`(${source.slice(environmentStart, environmentEnd)})`);
  const start = source.indexOf("export const DEFAULT_NAVIGATION: NavigationConfig = ") + "export const DEFAULT_NAVIGATION: NavigationConfig = ".length;
  const end = source.indexOf(";\n\nconst ICONS", start);
  return JSON.parse(source.slice(start, end).replace("DEFAULT_ENVIRONMENTS", JSON.stringify(environments)));
}

test("the header administrator starts with the exact five existing menus", () => {
  const defaults = defaultNavigation();
  assert.equal(defaults.environmentVisible, true);
  assert.deepEqual(defaults.menus.map((menu) => menu.id), ["product", "solution", "industry", "ai", "intro"]);
  assert.deepEqual(defaults.menus.map((menu) => menu.labelMn), ["Бүтээгдэхүүн", "Шийдэл", "Салбар", "AI хөгжүүлэлт", "Танилцуулга"]);
  assert.ok(defaults.menus.every((menu) => menu.groups.length && menu.groups.every((group) => group.items.length)));
  assert.ok(defaults.menus.every((menu) => menu.groups.flatMap((group) => group.items).every((item) => item.icon)));
  assert.doesNotMatch(JSON.stringify(defaults.menus), /Үнэ|Pricing|iBeX орчин|iBeX environment/);
  assert.deepEqual(defaults.environments.map((environment) => environment.id), ["web", "mobile"]);
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
  for (const existing of ["partners", "people", "pricing", "ai", "social"]) assert.match(hub, new RegExp(`id: "${existing}"`));
  const aiHub = read("app/admin/ai/page.tsx");
  assert.match(aiHub, /Home AI мэдлэгийн сан/);
  assert.match(aiHub, /Маркетинг AI/);
  assert.match(editor, /Ноорог хадгалах/);
  assert.match(editor, /Нийтлэх/);
  assert.match(editor, /Урьдчилан харах/);
  assert.match(editor, /navigation-environment-toggle/);
  assert.match(editor, /environmentVisible/);
  assert.match(css, /navigation-admin-page[^}]+overflow:auto/);
  assert.match(css, /Version 48:[\s\S]+\.navigation-admin-page\{[\s\S]*?height:100dvh;[\s\S]*?overflow-y:auto;[\s\S]*?touch-action:pan-y/);
  assert.match(css, /\[data-ibex-theme="day"\] \.navigation-admin-page \.navigation-menu-tabs button\.active/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]+\.navigation-admin-page \.navigation-menu-tabs\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /navigation-field-grid textarea\{min-height:96px[^}]+resize:vertical/);
});

test("public navigation keeps the existing renderer and safe fallback", () => {
  const publicApi = read("app/api/content/route.ts"), concept = read("public/concept.html"), adapter = read("public/navigation-content.js");
  assert.match(publicApi, /if \(!content\.navigation\) content\.navigation = cloneDefaultNavigation\(\)/);
  assert.match(concept, /<script src="\/navigation-content\.js"><\/script>/);
  assert.match(adapter, /navigationBaseIcon=ibexMenuIcon/);
  assert.match(adapter, /rebuildHeaderMenus\(config\)/);
  assert.match(adapter, /menu\.archived!==true&&menu\.enabled!==false/);
  assert.match(adapter, /window\.open\(href,'_blank','noopener,noreferrer'\)/);
});
