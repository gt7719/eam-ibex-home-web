import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 37 removes system administration from both knowledge-center languages", () => {
  const concept = read("public/concept.html");
  assert.doesNotMatch(concept, /Системийн админ тохиргоо|System Administration/);
  assert.doesNotMatch(read("public/detail-articles.js"), /This guidance concerns the actual iBeX system|Энэ гарын авлага нь iBeX системийн админд хамаарна/);
});

test("version 37 assigns a unique explicit icon to every choice in each menu", () => {
  const context = vm.createContext({});
  const concept = read("public/concept.html");
  vm.runInContext(concept.slice(concept.indexOf("const headerMenus="), concept.indexOf("const menuExperience=")), context);
  vm.runInContext(read("public/menu-icons.js"), context);
  const result = vm.runInContext(`Object.fromEntries(Object.entries(headerMenus).filter(([key,menu])=>!menu.pricing&&key!=='environment').map(([key,menu])=>{
    const assigned=menu.groups.flatMap((group,groupIndex)=>group.items.map((item,itemIndex)=>ibexMenuIconName(key,groupIndex,itemIndex)));
    return [key,{assigned,total:menu.groups.flatMap(group=>group.items).length}];
  }))`, context);
  for (const [key, value] of Object.entries(result)) {
    assert.equal(value.assigned.length, value.total, key);
    assert.ok(value.assigned.every(Boolean), key);
    assert.equal(new Set(value.assigned).size, value.assigned.length, key);
  }
  assert.doesNotMatch(read("public/menu-icons.js"), /generic|label.*toLowerCase/);
});

test("version 37 gives content forms the approved scroll and writing space", () => {
  const globals = read("app/globals.css"), design = read("public/design-system.css"), concept = read("public/concept.html");
  assert.match(globals, /\.admin-users-page[^}]+height:\s*100dvh[^}]+overflow-y:\s*auto/);
  assert.match(design, /admin-copy-partner textarea\s*\{\s*min-height:\s*160px/);
  assert.match(design, /admin-copy-person textarea\s*\{\s*min-height:\s*180px/);
  assert.match(concept, /adminTextarea\(a\.descriptionMn,'descriptionMn',p\.descriptionMn,'partner'\)/);
  assert.match(concept, /adminTextarea\(a\.descriptionEn,'descriptionEn',p\.descriptionEn,'person'\)/);
});

test("version 37 makes public events administrator-managed and public-safe", () => {
  const admin = read("app/admin/social/page.tsx"), api = read("app/api/admin/social-content/route.ts"), publicApi = read("app/api/content/route.ts"), details = read("public/continuous-details.js");
  for (const field of ["titleMn", "titleEn", "summaryMn", "summaryEn", "descriptionMn", "descriptionEn", "eventTypeMn", "eventTypeEn", "startAt", "endAt", "locationMn", "locationEn", "organizerMn", "organizerEn", "galleryUrls", "sortOrder"])
    assert.match(admin, new RegExp(field));
  assert.match(api, /r\.type==='event'/);
  assert.match(api, /row\.type==='event'.*row\.status==='published'/);
  assert.match(publicApi, /entry\?\.status === "published" && entry\?\.enabled !== false/);
  assert.match(details, /socialRows\('event'\)/);
  assert.match(details, /event-resource-card/);
});
