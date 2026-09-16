import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 61 renders administrator offers beside dropdown-only duration controls", () => {
  const page = read("public/concept.html"), offers = read("public/launch-offer.js"), style = read("public/launch-offer.css");
  assert.match(page, /<select id="billingDuration">/);
  assert.match(page, /<select id="billingUnit">/);
  assert.match(page, /id="pricingOfferPanel"/);
  assert.match(page, /Math\.min\(12,max\)/);
  assert.match(offers, /renderPricingOfferPanel/);
  assert.match(offers, /offer\.startsAt/);
  assert.match(offers, /offer\.expiresAt/);
  assert.match(style, /\.pricing-offer-panel/);
});

test("version 61 opens pricing details at the heading without an automatic card scroll", () => {
  const page = read("public/concept.html");
  const select = page.match(/function selectPricingPlan[\s\S]*?\nfunction updatePaymentSummary/)?.[0] || "";
  assert.doesNotMatch(select, /scrollIntoView/);
  assert.match(page, /close\.focus\(\{preventScroll:true\}\)/);
  assert.match(page, /requestAnimationFrame\(\(\)=>\{scroll\.scrollTop=0/);
});

test("version 61 keeps administrator navigation outside every scrolling body", () => {
  const admin = read("app/admin/page.tsx"), style = read("app/globals.css");
  assert.match(admin, /Home AI удирдлага/);
  assert.match(admin, /admin-hub-tabs/);
  assert.match(admin, /admin-hub-content/);
  assert.match(style, /admin-hub-shell\.admin-hub-single[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\)/);
  assert.match(style, /admin-hub-shell\.admin-hub-single > \.admin-hub-content[\s\S]*overflow:\s*hidden/);
});
