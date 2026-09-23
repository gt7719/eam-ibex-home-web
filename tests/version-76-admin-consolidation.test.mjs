import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 76 combines partners and team under one permission-aware project implementers tab", () => {
  const page = read("app/admin/page.tsx");
  assert.match(page, /id: "implementers"[\s\S]*?mn: "Төсөл хэрэгжүүлэгчид"/);
  assert.match(page, /const implementerAreas = \[/);
  assert.match(page, /permission: "partners\.manage"[\s\S]*?section=partners/);
  assert.match(page, /permission: "people\.manage"[\s\S]*?section=people/);
  assert.match(page, /permission === "partners\.manage" \|\| permission === "people\.manage"/);
  assert.match(page, /allowedImplementerAreas/);
  assert.doesNotMatch(page, /\{ id: "partners", permission: "partners\.manage"[^\n]+adminSections/);
});

test("version 76 synchronizes administrator permissions with the revised menu without changing permission ids", () => {
  const page = read("app/admin/users/page.tsx");
  assert.match(page, /const permissionGroups/);
  assert.match(page, /label: "Төсөл хэрэгжүүлэгчид"/);
  assert.match(page, /label: "AI удирдлага"/);
  assert.match(page, /label: "Нэмэлт эрх"/);
  assert.match(page, /Ерөнхий AI мэдлэг, iBeX лавлагаа/);
  assert.match(page, /баталгаажуулалтын тохиргоо, илгээлтийн түүх/);
  assert.match(page, /Бүгдийг сонгох/);
  assert.match(page, /beforeunload/);
  assert.match(page, /Хадгалаагүй өөрчлөлтийг цуцлах уу/);
  for (const permission of ["navigation.manage", "pricing.manage", "partners.manage", "people.manage", "knowledge.manage", "marketing.manage", "social.manage", "accounts.manage", "media.upload"])
    assert.match(page, new RegExp(permission.replace(".", "\\.")));
});

test("version 76 centralizes verification readiness policy and delivery history under website users", () => {
  const page = read("app/admin/site-users/page.tsx");
  const route = read("app/api/admin/site-users/route.ts");
  for (const label of ["Хэрэглэгчид", "Баталгаажуулалтын тохиргоо", "Илгээлтийн түүх"])
    assert.match(page, new RegExp(label));
  assert.match(page, /verificationReadiness/);
  assert.match(page, /delivery-history-table/);
  assert.match(route, /ORDER BY e\.created_at DESC LIMIT 100/);
  assert.match(route, /policy\.emailRequired && !readiness\.email\.ready/);
  assert.match(route, /policy\.phoneRequired && !readiness\.sms\.ready/);
  assert.match(route, /RESEND_API_KEY/);
  assert.match(route, /IBEX_SMS_DELIVERY_TOKEN/);
  assert.doesNotMatch(page, /RESEND_API_KEY|IBEX_SMS_DELIVERY_TOKEN|TURNSTILE_SECRET_KEY/);
});

test("version 76 keeps selected permission cards readable and responsive", () => {
  const css = read("app/globals.css");
  assert.match(css, /v76: approved admin navigation/);
  assert.match(css, /html\[data-ibex-theme="day"\] \.admin-permission-option:has\(input:checked\)/);
  assert.match(css, /\.admin-permission-option strong\{color:var\(--admin-text\);font-size:14px/);
  assert.match(css, /\.admin-permission-group \.admin-permission-grid\{grid-template-columns:repeat\(2/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*?\.admin-permission-group \.admin-permission-grid\{grid-template-columns:1fr\}/);
});
