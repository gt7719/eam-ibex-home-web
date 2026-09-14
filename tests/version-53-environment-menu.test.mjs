import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 53 uses one shared header menu state for iBeX environments", () => {
  const concept = read("public/concept.html"), adapter = read("public/navigation-content.js");
  assert.match(concept, /class="menu-trigger" data-menu="environment"/);
  assert.doesNotMatch(concept, /environmentDropdown|environment-trigger/);
  assert.match(concept, /environment:\{k:'iBeX ОРЧИН/);
  assert.match(concept, /environment:\{k:'iBeX ENVIRONMENT/);
  assert.match(adapter, /environmentButton=nav\.querySelector/);
  assert.match(adapter, /environmentItem\.hidden=config\.environmentVisible===false/);
  assert.doesNotMatch(concept, /version-52-header\.js/);
});

test("version 53 exposes only visibility for the protected environment menu", () => {
  const model = read("app/lib/navigation.ts"), editor = read("app/admin/navigation/page.tsx"), css = read("app/post-v30-admin.css");
  assert.match(model, /NavigationConfig = \{ environmentVisible: boolean; menus:/);
  assert.match(model, /"environmentVisible": true/);
  assert.match(model, /environmentVisible: \(value as \{ environmentVisible\?: unknown \}\)\.environmentVisible !== false/);
  assert.match(editor, /className="navigation-protected-menu"/);
  assert.match(editor, /checked=\{draft\.environmentVisible\}/);
  assert.match(editor, /Веб, мобайл орчны нэр, дэд цэс болон холбоос өөрчлөгдөхгүй/);
  assert.match(css, /Version 53: protected iBeX environment visibility control/);
});
