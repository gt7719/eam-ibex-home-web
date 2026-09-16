import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 68 keeps My Plan read-only and exposes its stored subscription snapshot", () => {
  const page = read("app/account/page.tsx");
  assert.doesNotMatch(page, /my-package-form/);
  assert.doesNotMatch(page, /saveSubscription/);
  assert.match(page, /Багц сонголт байхгүй/);
  assert.match(page, /my-package-details/);
  assert.match(page, /Багцын хязгаар ба модуль/);
  assert.match(page, /Авсан урамшуулал/);
});

test("version 68 opens Home AI from My iBeX as a single-scroll right drawer", () => {
  const page = read("app/account/page.tsx"), drawer = read("app/components/home-ai-drawer.tsx"), css = read("app/globals.css");
  assert.match(page, /HomeAiDrawer open=\{homeAiOpen\}/);
  assert.match(page, /function openHomeAi/);
  assert.match(drawer, /role="dialog"/);
  assert.match(css, /\.home-ai-drawer\{display:flex;flex-direction:column/);
  assert.match(css, /\.home-ai-drawer-content\{display:grid[^}]*overflow-y:auto/);
  assert.doesNotMatch(css, /\.home-ai-messages\{[^}]*overflow-y/);
});

test("version 68 gives the public header an authenticated My iBeX identity trigger", () => {
  const navigation = read("public/navigation-content.js"), session = read("app/api/account/session/route.ts"), css = read("app/globals.css");
  assert.match(navigation, /renderWebsiteAccountIdentity/);
  assert.match(navigation, /loginWrap\.classList\.add\('authenticated'\)/);
  assert.match(navigation, /header-account-avatar/);
  assert.match(session, /profileImageUrl/);
  assert.match(css, /width:min\(1640px,100%\)/);
  assert.match(css, /\.account-alert\.success\{color:#d6ffe6/);
});
