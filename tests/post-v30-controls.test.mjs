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

test("pricing and social content controls are permission-gated admin surfaces", () => {
  const admin = read("app/admin/page.tsx"),
    hub = read("public/post-v31-admin-hub.js"),
    concept = read("public/concept.html"),
    payments = read("app/api/admin/payment-settings/route.ts"),
    social = read("app/api/admin/social-content/route.ts");
  assert.doesNotMatch(admin, /href="\/admin\/pricing"/);
  assert.doesNotMatch(admin, /href="\/admin\/assistant"/);
  assert.doesNotMatch(admin, /href="\/admin\/social"/);
  assert.match(concept, /pricing:'pricing\.manage'/);
  assert.match(hub, /knowledge:'knowledge\.manage'/);
  assert.match(hub, /social:'social\.manage'/);
  assert.match(payments, /hasAdminPermission\(user, "pricing\.manage"\)/);
  assert.match(social, /hasAdminPermission\(user,'social\.manage'\)/);
});

test("all five content areas share one internal permission-aware tab row", () => {
  const admin = read("app/admin/page.tsx"),
    hub = read("public/post-v31-admin-hub.js"),
    concept = read("public/concept.html"),
    style = read("app/globals.css");
  for (const section of [
    "partners",
    "people",
    "pricing",
    "knowledge",
    "social",
  ])
    assert.match(admin, new RegExp(`id:\\s*["']${section}["']`));
  assert.match(admin, /admin-hub-tabs/);
  assert.match(admin, /permissions\.has\(section\.permission\)/);
  assert.match(admin, /\/admin\/pricing\?embedded=1/);
  assert.doesNotMatch(
    admin,
    /concept\.html\?admin=content[^\"]+hubSection=pricing/,
  );
  assert.match(hub, /embeddedHub/);
  assert.match(style, /overscroll-behavior:contain/);
  assert.match(style, /html\.admin-hub-open[^}]+overflow:hidden/);
  assert.match(concept, /post-v31-admin-hub\.js/);
});

test("public pricing admin affordance stays hidden and scroll-to-top avoids actions", () => {
  const script = read("public/post-v30-controls.js"),
    style = read("public/post-v30.css");
  assert.match(script, /megaAdmin\.hidden\s*=\s*true/);
  assert.match(script, /detail-footer-action, #detailContent \.payment-panel/);
  assert.match(style, /\.detail-top\.avoid-actions\{bottom:/);
});

test("version 34 unifies appearance typography compact checkout and mobile billing behavior", () => {
  const script = read("public/post-v30-controls.js");
  const paymentStyle = read("public/post-v30.css");
  const standard = read("public/post-v34.css");
  const globals = read("app/globals.css");
  for (const page of [
    "public/concept.html",
    "public/organization-preview.html",
    "public/package-admin.html",
  ]) {
    assert.match(read(page), /post-v34\.css/);
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
