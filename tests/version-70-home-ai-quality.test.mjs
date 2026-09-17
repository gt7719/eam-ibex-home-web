import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Home AI treats greetings as greetings instead of searching unrelated material", () => {
  const customerAi = read("app/lib/customer-ai.ts");
  const route = read("app/api/assistant/chat/route.ts");
  assert.match(customerAi, /\^\(\?:hi\|hello\|hey\)\$/);
  assert.match(customerAi, /Сайн байна уу! Би Home AI/);
  assert.match(route, /if \(isCustomerAiGreeting\(parsed\.payload\.message\)\)/);
  assert.match(route, /mode: "greeting"/);
});

test("Home AI only retrieves approved public Home Web knowledge", () => {
  const route = read("app/api/assistant/chat/route.ts");
  assert.doesNotMatch(route, /ibex-book-knowledge\.json/);
  assert.match(route, /retrieveCustomerAiKnowledge\(\s*managedKnowledge/s);
  assert.match(route, /Never use research, laboratory, protocol, book, tenant, payment, or internal administrative material/);
});

test("Home AI drawer submits with Enter and keeps Shift+Enter for a new line", () => {
  const drawer = read("app/components/home-ai-drawer.tsx");
  const css = read("app/globals.css");
  assert.match(drawer, /event\.key === "Enter" && !event\.shiftKey/);
  assert.match(drawer, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
  assert.match(css, /border-radius:28px 0 0 28px/);
  assert.match(css, /background:rgba\(7,5,10,\.9\)/);
});

test("desktop signed-in header leaves readable space for the full user identity", () => {
  const html = read("public/concept.html");
  const css = read("public/version-72-stability.css");
  const navigation = read("public/navigation-content.js");
  assert.match(html, /class="header-account-link" id="headerAccountLink"/);
  assert.match(navigation, /loginWrap\.classList\.add\('account-authenticated'\)/);
  assert.match(css, /\.login-wrap\.account-authenticated/);
  assert.match(css, /\.header-account-link \.header-account-copy small/);
  assert.doesNotMatch(css, /\.login\.authenticated/);
});
