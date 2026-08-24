import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/concept.html", import.meta.url), "utf8");

test("large displays expand the admin workspace", () => {
  assert.match(source, /@media\(min-width:1200px\)[\s\S]*?\.admin-panel\{width:min\(92vw,1780px\);height:min\(92dvh,980px\)\}/);
});

test("large displays expand and center header detail windows", () => {
  assert.match(source, /@media\(min-width:1600px\)[\s\S]*?\.detail-overlay\{display:grid;place-items:center/);
  assert.match(source, /\.detail-shell\{width:min\(84vw,1600px\);height:min\(90dvh,980px\);margin:0\}/);
});

test("large admin fields use the available horizontal space", () => {
  assert.match(source, /\.admin-fields\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:12px\}/);
  assert.match(source, /\.admin-content-fields\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
});
