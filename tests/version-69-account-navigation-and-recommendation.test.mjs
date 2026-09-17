import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { initialConfig, recommend } from "../public/package-model.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 69 recommends the lowest tier satisfying features, users and assets", () => {
  const config = initialConfig();
  const recommendation = recommend(config, { menus: [], dashboards: [], users: 5, assets: 10 });
  assert.equal(recommendation.rank, 1);
  assert.equal(recommendation.needsReview, false);
  assert.equal(recommend(config, { menus: ["warehouse"], dashboards: [], users: 5, assets: 10 }).rank, 2);
});

test("version 69 moves Home AI to an animated floating launcher", () => {
  const page = read("app/account/page.tsx"), drawer = read("app/components/home-ai-drawer.tsx"), css = read("app/globals.css");
  assert.doesNotMatch(page, /onClick=\{openHomeAi\}>Home AI/);
  assert.match(drawer, /account-home-ai-launch/);
  assert.match(drawer, /home-ai-drawer-layer\$\{open \? " is-open"/);
  assert.match(css, /\.home-ai-drawer-layer\.is-open\{visibility:visible/);
  assert.match(css, /\.home-ai-drawer-layer\.is-open \.home-ai-drawer\{transform:translateX\(0\)/);
});

test("version 69 limits the signed-in header menu to workspace access and sign out", () => {
  const concept = read("public/concept.html"), navigation = read("public/navigation-content.js");
  assert.match(concept, /id="webAccountLogout"/);
  assert.match(concept, /id="systemLoginLink"/);
  assert.match(navigation, /link\.hidden=true;admin\.hidden=true;logout\.hidden=false/);
  assert.match(navigation, /\/api\/account\/logout/);
  assert.match(concept, /\.login\.authenticated\{width:270px/);
});
