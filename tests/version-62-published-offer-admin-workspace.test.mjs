import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("published offers remain visible while price calculation only uses their active window", () => {
  const model = read("app/lib/launch-offer-model.ts"), offers = read("public/launch-offer.js"), page = read("public/concept.html");
  assert.match(model, /const pricingActive = now >= startsAt && now < expiresAt/);
  assert.match(model, /displayState = pricingActive \? "active" : now < startsAt \? "scheduled" : "ended"/);
  assert.match(offers, /function publishedPlanOffer\(planId\)/);
  assert.match(offers, /function offerIsActive\(offer\)/);
  assert.match(offers, /\[publishedPlanOffer\(selected\.id\)\]/);
  assert.match(offers, /Starts \$\{format\.format/);
  assert.match(page, /summary=p\.monthlyMnt===null\?null:priceSummary\(p,en\)/);
  assert.match(page, /plan-duration-total/);
});

test("admin shell gives the working pane remaining height and Home AI can scroll internally", () => {
  const style = read("app/globals.css"), homeAi = read("app/admin/home-ai/style.css");
  assert.match(style, /Version 62: compact shared admin chrome/);
  assert.match(style, /\.admin-hub-page \{ grid-template-rows:auto minmax\(0,1fr\); padding:16px/);
  assert.match(style, /\.admin-hub-shell\.admin-hub-single > \.admin-hub-content \{ min-height:0; height:auto; \}/);
  assert.match(style, /\.admin-ai-workspace > \.ai-admin-frame \{ flex:1 1 auto; min-height:0; height:auto;/);
  assert.match(homeAi, /\.home-ai-control\.embedded\{box-sizing:border-box;min-height:100%;height:100%;overflow:auto;/);
});
