import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 52 gives every website account screen a visible home close control", () => {
  const shell = read("app/components/account-shell.tsx"), css = read("app/globals.css");
  assert.match(shell, /className="account-close" href="\/"/);
  assert.match(shell, /Return to home/);
  assert.match(css, /\.account-close\{/);
  assert.match(css, /data-ibex-theme="day"\] \.account-close/);
});

test("registration uses one auto-selected calling-code control and the approved password policy", () => {
  const page = read("app/register/page.tsx"), auth = read("app/lib/site-user-auth.ts"), reset = read("app/api/account/reset-password/route.ts");
  assert.doesNotMatch(page, /t\("Улс", "Country"\)/);
  assert.match(page, /t\("Улсын код", "Calling code"\).*?<select/s);
  assert.match(page, /\/api\/account\/country/);
  assert.match(page, /minLength=\{8\}/);
  assert.match(auth, /validateSitePassword/);
  assert.match(auth, /\\p\{Lu\}/);
  assert.match(auth, /\\p\{N\}/);
  assert.match(auth, /\[\^\\p\{L\}\\p\{N\}\\s\]/);
  assert.match(reset, /validateSitePassword\(password\)/);
});

test("registration is compact on desktop, stacks on mobile and has explicit day-mode contrast", () => {
  const page = read("app/register/page.tsx"), css = read("app/globals.css");
  assert.match(page, /variant="registration"/);
  assert.match(page, /account-form account-register-form/);
  assert.match(css, /\.account-register-form\{grid-template-columns:repeat\(2/);
  assert.match(css, /@media\(max-width:680px\).*?\.account-register-form\{grid-template-columns:1fr/s);
  assert.match(css, /data-ibex-theme="day"\] \.account-optional\{border-color:#74bc97;background:#eef9f3\}/);
  assert.match(css, /data-ibex-theme="day"\] \.account-actions>a:not\(\.account-primary-link\)/);
});

test("registration is separate from the sign-in menu and is hidden for a signed-in website user", () => {
  const concept = read("public/concept.html"), adapter = read("public/navigation-content.js");
  const registerIndex = concept.indexOf('id="headerRegisterLink"');
  const loginIndex = concept.indexOf('id="loginWrap"');
  const dropdownStart = concept.indexOf('id="loginDropdown"');
  const dropdownEnd = concept.indexOf('</div></div>', dropdownStart);
  assert.ok(registerIndex > 0 && registerIndex < loginIndex);
  assert.doesNotMatch(concept.slice(dropdownStart, dropdownEnd), /href="\/register"/);
  assert.match(adapter, /getElementById\('headerRegisterLink'\)/);
  assert.match(adapter, /register\)register\.hidden=true/);
});

test("protected iBeX environment menu separates web and mobile routes", () => {
  const concept = read("public/concept.html"), adapter = read("public/navigation-content.js"), modal = read("public/organization-modal.js");
  assert.match(concept, /class="menu-trigger" data-menu="environment"/);
  assert.match(concept, /href:'\/organization',environmentTarget:'web'/);
  assert.match(concept, /href:'\/mobile',environmentTarget:'mobile'/);
  assert.match(adapter, /Pricing and iBeX\s+\/\/ environment remain protected|Pricing and iBeX\n\/\/ environment remain protected/);
  assert.match(adapter, /menuTriggers\.splice\(0,menuTriggers\.length,\.\.\.primaryButtons,environmentButton,pricingButton/);
  assert.match(modal, /globalThis\.openOrganization=openOrganization/);
});

test("mobile environment route is truthful about its version 52 foundation boundary", () => {
  const page = read("app/mobile/page.tsx");
  assert.match(page, /Хүсэлт үүсгэх/);
  assert.match(page, /Оноосон ажил гүйцэтгэх/);
  assert.match(page, /Хүсэлтийн явц хянах/);
  assert.match(page, /мобайл үйлдлүүд идэвхжээгүй/);
  assert.match(page, /href="\/organization"/);
});
