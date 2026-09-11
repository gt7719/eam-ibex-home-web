import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public pricing has persistent BUY actions and MNT monthly/annual checkout", () => {
  const script = read("public/post-v30-controls.js"),
    style = read("public/post-v30.css");
  assert.match(script, /BUY · ХУДАЛДАН АВАХ/);
  assert.match(script, /Сараар/);
  assert.match(script, /Жилээр/);
  assert.match(script, /Үнийг MNT-ээр харуулна/);
  assert.match(style, /\.detail-plan>\.plan-select\{flex:0 0 auto/);
  assert.match(style, /\.detail-plan>\.plan-scope\{flex:1/);
});

test("checkout offers card QR bank app transfer and other methods without inventing links", () => {
  const script = read("public/post-v30-controls.js");
  for (const id of ["card", "qr", "bank_app", "transfer", "other"])
    assert.match(script, new RegExp(`id:\\s*["']${id}["']`));
  assert.match(script, /БАНКНЫ ХОЛБООС ТОХИРУУЛААГҮЙ/);
  assert.match(script, /method\.checkoutUrl/);
  assert.match(script, /id="paymentDetail"/);
  assert.match(script, /payment-hosted-frame/);
  assert.match(
    script,
    /Картын дугаар болон CVV-г банк боловсруулж, iBeX вебсайт хадгалахгүй/,
  );
  assert.match(
    script,
    /Зөвхөн холбогдсон банк эсвэл gateway-ээс ирсэн бодит QR-г харуулна/,
  );
});

test("configured QR image and bank-app links render as real payment choices", () => {
  const script = read("public/post-v30-controls.js"), style = read("public/post-v30.css"), admin = read("app/admin/pricing/page.tsx");
  assert.match(script, /method\.id === "qr" && method\.imageUrl/);
  assert.match(script, /enabledBankApps\(method\)/);
  assert.match(script, /payment-bank-app-grid/);
  assert.match(script, /target="_blank" rel="noopener noreferrer"/);
  assert.match(style, /\.bank-qr-image/);
  assert.match(admin, /accept=/);
  assert.match(admin, /Аппын зураг/);
  assert.match(admin, /Банкны холбоос/);
});

test("pricing and social content controls are permission-gated admin surfaces", () => {
  const admin = read("app/admin/page.tsx"),
    hub = read("public/post-v31-admin-hub.js"),
    concept = read("public/concept.html"),
    payments = read("app/api/admin/payment-settings/route.ts"),
    social = read("app/api/admin/social-content/route.ts");
  assert.match(admin, /\/admin\/pricing\?embedded=1/);
  assert.match(admin, /className="admin-hub-tabs"/);
  assert.match(admin, /allowedSections = adminSections\.filter/);
  assert.match(concept, /pricing:'pricing\.manage'/);
  assert.match(hub, /knowledge:'knowledge\.manage'/);
  assert.match(hub, /social:'social\.manage'/);
  assert.match(payments, /hasAdminPermission\(user, "pricing\.manage"\)/);
  assert.match(social, /hasAdminPermission\(user,'social\.manage'\)/);
});

test("all five content areas share exactly one visible permission-aware tab row", () => {
  const admin = read("app/admin/page.tsx"),
    hub = read("public/post-v31-admin-hub.js"),
    concept = read("public/concept.html"),
    style = read("public/admin-hub.css");
  assert.equal((admin.match(/className="admin-hub-tabs"/g) || []).length, 1);
  assert.match(admin, /concept\.html\?admin=content&embeddedHub=1&section=partners/);
  assert.match(admin, /\/admin\/pricing\?embedded=1/);
  assert.match(hub, /\['partners','people','pricing','knowledge','social'\]/);
  assert.match(hub, /embeddedHub/);
  assert.match(style, /embedded-admin-hub \.admin-head/);
  assert.match(style, /embedded-admin-hub \.admin-tabs/);
  assert.match(style, /overscroll-behavior:\s*contain/);
  assert.match(read("app/globals.css"), /html\.admin-hub-open[^}]+overflow:hidden/);
  assert.match(concept, /admin-hub\.css/);
});

test("public pricing admin affordance stays hidden and scroll-to-top avoids actions", () => {
  const script = read("public/post-v30-controls.js"),
    style = read("public/post-v30.css");
  assert.match(script, /megaAdmin\.hidden\s*=\s*true/);
  assert.match(script, /detail-footer-action, #detailContent \.payment-panel/);
  assert.match(style, /\.detail-top\.avoid-actions\{bottom:/);
});

test("version 35 centralizes appearance typography compact checkout and mobile billing behavior", () => {
  const script = read("public/post-v30-controls.js");
  const paymentStyle = read("public/post-v30.css");
  const standard = read("public/design-system.css");
  const globals = read("app/globals.css");
  for (const page of [
    "public/concept.html",
    "public/organization-preview.html",
    "public/package-admin.html",
  ]) {
    assert.match(read(page), /design-system\.css/);
  }
  assert.match(script, /preventScroll:\s*true/);
  assert.match(script, /detailScroll\.scrollTop\s*=\s*top/);
  assert.match(script, /Жишээ:\s*4111 1111 1111 1111/);
  assert.match(paymentStyle, /\.billing-switch\s*\{[^}]*position:\s*sticky/s);
  assert.match(paymentStyle, /\.payment-panel\s*\{[^}]*max-width:\s*640px/s);
  assert.match(globals, /\[data-ibex-theme="day"\]\s+\.admin-hub-page/);
  assert.match(globals, /font-family:\s*"?Inter"?/);
  assert.match(standard, /--ibex-font-display:\s*"?Manrope"?/);
  assert.match(
    standard,
    /@media\s*\(max-width:\s*680px\)[\s\S]*font-size:\s*16px/,
  );
});

test("version 35 prevents hidden chrome regressions and stale pricing sources", () => {
  const concept = read("public/concept.html"),
    standard = read("public/design-system.css"),
    assistant = read("public/assistant-widget.css"),
    layout = read("app/layout.tsx"),
    packages = read("public/package-admin.mjs");
  assert.match(standard, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  assert.ok(concept.indexOf("assistant-widget.css") < concept.indexOf("design-system.css"));
  assert.doesNotMatch(concept, /\$0|\$5|\$20|\$100/);
  assert.doesNotMatch(assistant, /font-size:\s*(?:6\.5|7|7\.5|8|9|10)px/);
  assert.match(layout, /ibex-global-appearance/);
  assert.match(packages, /addEventListener\('storage',syncStoredAppearance\)/);
});

test("day-mode semantic colors and knowledge scroll use the audited contract", () => {
  const standard = read("public/design-system.css"),
    globals = read("app/globals.css"),
    combined = `${standard}\n${globals}`.toLowerCase();
  for (const color of ["#176b46", "#4f3d5b", "#5f5665", "#e7f6ee", "#6f6575"])
    assert.match(combined, new RegExp(color));
  assert.match(globals, /button:disabled[\s\S]*opacity:\s*1\s*!important/);
  assert.match(globals, /embedded-admin-page\.knowledge-page[\s\S]*overflow:\s*hidden\s*!important/);
});
