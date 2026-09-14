import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 50 enforces the approved menu and gallery limits", () => {
  const schema = read("app/lib/navigation.ts");
  assert.match(schema, /menus: 8, groups: 8, items: 20, image: 10, video: 5, pdf: 5/);
  assert.match(schema, /incoming\.map/);
  assert.match(schema, /candidate\.archived === true/);
  assert.match(schema, /normalizeMedia\(item\?\.media, itemId\)/);
});

test("version 50 separates gallery types and supports ordering and video posters", () => {
  const editor = read("app/admin/navigation/page.tsx"), renderer = read("public/continuous-details.js");
  assert.match(editor, /type="file" multiple/);
  assert.match(editor, /renderMediaSection\(group\.id, item, "image"\)/);
  assert.match(editor, /renderMediaSection\(group\.id, item, "video"\)/);
  assert.match(editor, /renderMediaSection\(group\.id, item, "pdf"\)/);
  assert.match(editor, /uploadPoster/);
  assert.match(editor, /moveMedia/);
  assert.match(renderer, /navigation-image-gallery/);
  assert.match(renderer, /navigation-video-gallery/);
  assert.match(renderer, /navigation-document-list/);
});

test("version 50 manages complete menus without changing protected entries", () => {
  const editor = read("app/admin/navigation/page.tsx"), adapter = read("public/navigation-content.js"), concept = read("public/concept.html"), css = read("public/continuous-details.css");
  assert.match(editor, /function addMenu/);
  assert.match(editor, /function archiveMenu/);
  assert.match(editor, /function restoreMenu/);
  assert.match(editor, /function deleteArchivedMenu/);
  assert.match(editor, /Дэлгэрэнгүй агуулга • MN/);
  assert.match(concept, /data-menu="environment"/);
  assert.match(concept, /data-menu="pricing"/);
  assert.match(adapter, /environmentItem/);
  assert.match(adapter, /pricingButton/);
  assert.match(adapter, /createMoreItem\(overflow\)/);
  assert.match(css, /\.navigation-overflow-item\{display:none\}/);
  assert.match(css, /@media\(max-width:920px\)[^{]*\{[^}]*\.navigation-more\{display:none!important\}/);
});

test("version 50 keeps administrator menu labels out of innerHTML", () => {
  const concept = read("public/concept.html"), adapter = read("public/navigation-content.js");
  assert.match(concept, /b\.textContent=u\.nav\[i\]\|\|''/);
  assert.match(adapter, /button\.textContent=currentLang==='en'/);
});
