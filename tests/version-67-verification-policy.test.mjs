import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 67 reconciles only pending and limited users with the saved system policy", () => {
  const route = read("app/api/admin/site-users/route.ts");
  assert.match(route, /WHERE account_status IN \('pending','limited'\)/);
  assert.match(route, /SET email_verification_required=\?,\s*phone_verification_required=\?/s);
  assert.match(route, /WHEN \(\?=0 OR email_status='verified'\)[\s\S]*?THEN 'active'/);
  assert.match(route, /WHEN \?=1 AND email_status<>'verified' THEN 'pending'/);
  assert.match(route, /reconciledUsers: Number\(reconciled\.meta\?\.changes \|\| 0\)/);
});

test("version 67 keeps the policy explanation and result aligned with pending and limited accounts", () => {
  const page = read("app/admin/site-users/page.tsx");
  assert.match(page, /хүлээгдэж буй болон хязгаарлагдмал/);
  assert.match(page, /payload\.reconciledUsers/);
  assert.match(page, /await load\(\);/);
});

test("version 67 makes verification and user-detail actions readable in day mode", () => {
  const css = read("app/globals.css");
  assert.match(css, /html\[data-ibex-theme="day"\] \.verification-policy-controls>button/);
  assert.match(css, /html\[data-ibex-theme="day"\] \.registered-user-actions button/);
  assert.match(css, /html\[data-ibex-theme="day"\] \.drawer-actions button/);
  assert.match(css, /color:#124e31/);
});
