import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated account navigation and menu are separate accessible controls", () => {
  const html = read("public/concept.html");
  const navigation = read("public/navigation-content.js");
  const css = read("public/version-72-stability.css");
  const accountLink = html.indexOf('id="headerAccountLink"');
  const menuButton = html.indexOf('id="loginLink"');
  assert.ok(accountLink > -1 && menuButton > accountLink);
  assert.match(html, /id="headerAccountLink" href="\/account"/);
  assert.match(html, /id="loginLink"[^>]+aria-expanded="false"[^>]+aria-controls="loginDropdown"/);
  assert.match(navigation, /loginWrap\.classList\.add\('account-authenticated'\)/);
  assert.match(css, /\.login-wrap\.account-authenticated/);
  assert.doesNotMatch(navigation, /window\.top\.location\.href='\/account'/);
});

test("Home AI keeps one session, isolates the modal footer and retains keyboard submit", () => {
  const drawer = read("app/components/home-ai-drawer.tsx");
  const publicWidget = read("public/assistant-widget.js");
  const css = read("app/globals.css");
  assert.match(drawer, /const sessionIdRef = useRef\(""\)/);
  assert.match(drawer, /sessionId: sessionIdRef\.current/);
  assert.doesNotMatch(drawer, /sessionId: `account-\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(publicWidget, /globalThis\.crypto\?\.randomUUID/);
  assert.match(publicWidget, /globalThis\.crypto\?\.getRandomValues/);
  assert.doesNotMatch(publicWidget, /value = crypto\.randomUUID\(\)/);
  assert.match(drawer, /document\.body\.classList\.add\("home-ai-modal-open"\)/);
  assert.match(drawer, /event\.key === "Enter" && !event\.shiftKey/);
  assert.match(css, /body\.home-ai-modal-open\{overflow:hidden\}/);
  assert.match(css, /body\.home-ai-modal-open \.account-security-note\{visibility:hidden;opacity:0\}/);
  assert.equal((css.match(/Version 72: canonical Home AI/g) || []).length, 1);
  assert.doesNotMatch(css, /Version 69: floating public-style assistant launcher/);
  assert.doesNotMatch(css, /Version 70: Home AI remains focused/);
  assert.doesNotMatch(css, /Version 71: messages grow only/);
});

test("Home AI uses recent context and calls OpenAI without requiring a matched source", () => {
  const customerAi = read("app/lib/customer-ai.ts");
  const route = read("app/api/assistant/chat/route.ts");
  assert.match(customerAi, /const previousQuestion = \[\.\.\.history\]\.reverse\(\)\.find/);
  assert.match(route, /const contextualQuery = customerAiContextualQuery/);
  assert.match(route, /managedKnowledge,\s*contextualQuery,/s);
  assert.match(route, /if \(!guard\) \{/);
  assert.doesNotMatch(route, /if \(!guard && sources\.length/);
  assert.doesNotMatch(route, /implementationAnswer|localAnswer/);
});
