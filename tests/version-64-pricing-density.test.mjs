import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pricing places compact duration controls vertically beside responsive offer cards", () => {
  const style = readFileSync(new URL("../public/launch-offer.css", import.meta.url), "utf8");
  assert.match(style, /grid-template-columns: minmax\(150px, 220px\) minmax\(0, 1fr\)/);
  assert.match(style, /\.duration-picker > label:nth-of-type\(2\) \{ grid-row: 2;/);
  assert.match(style, /\.pricing-offer-panel \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(style, /@media\(max-width:920px\)[\s\S]*?\.pricing-offer-panel \{ grid-template-columns:1fr; \}/);
});
