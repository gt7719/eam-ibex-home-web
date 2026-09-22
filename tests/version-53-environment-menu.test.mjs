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

test("version 74 extends the protected environment menu without changing its fixed header position", () => {
  const model = read("app/lib/navigation.ts"), editor = read("app/admin/navigation/page.tsx"), css = read("app/post-v30-admin.css");
  assert.match(model, /environmentVisible: boolean;\s+environments: EnvironmentConfig\[\];\s+menus:/);
  assert.match(model, /"environmentVisible": true/);
  assert.match(model, /status: "active"/);
  assert.match(model, /status: "preview"/);
  assert.match(model, /environmentVisible: \(value as \{ environmentVisible\?: unknown \}\)\.environmentVisible !== false/);
  assert.match(editor, /className="navigation-protected-menu"/);
  assert.match(editor, /checked=\{draft\.environmentVisible\}/);
  assert.match(editor, /Орчны нэр • MN/);
  assert.match(editor, /Ажиллагааны төлөв/);
  assert.match(editor, /Админ урьдчилан харах/);
  assert.match(css, /Version 53: protected iBeX environment visibility control/);
});
