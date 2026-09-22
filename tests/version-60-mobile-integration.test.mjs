import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 60 mounts the approved mobile preview as an isolated route", () => {
  const page = read("app/mobile/page.tsx");
  assert.match(page, /mobile-preview\/index\.html/);
  assert.match(page, /className="mobile-preview-frame"/);
  assert.match(page, /href="\/"/);
  assert.match(page, /Туршилтын орчин/);
  assert.doesNotMatch(page, /ХӨГЖҮҮЛЭГДЭЖ БАЙНА/);
});

test("mobile v5 assets and provenance are retained", () => {
  const html = read("public/mobile-preview/index.html");
  const script = read("public/mobile-preview/app.js");
  const styles = read("public/mobile-preview/styles.css");
  const source = read("public/mobile-preview/SOURCE.md");

  assert.match(html, /iBeX Mobile Preview/);
  assert.match(script, /allTasks:'Нийт даалгаврууд'/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(source, /5fae2a40601dfdc96920ed4dc5be3c44bd964af4/);
});

test("mobile preferences cannot overwrite the parent site theme", () => {
  const script = read("public/mobile-preview/app.js");
  assert.match(script, /ibex-mobile-theme/);
  assert.doesNotMatch(script, /setItem\('ibex-theme',state\.theme\)/);
  assert.doesNotMatch(script, /fetch\(/);
});

test("version 59 AI controls remain in the integrated source", () => {
  const homeAi = read("app/admin/home-ai/page.tsx");
  const marketingAi = read("app/admin/marketing-ai/page.tsx");
  const migration = read("drizzle/0007_steady_calypso.sql");
  assert.match(homeAi, /Home AI/);
  assert.match(marketingAi, /Marketing AI/);
  assert.match(migration, /marketing_ai_rate_limits/);
});
