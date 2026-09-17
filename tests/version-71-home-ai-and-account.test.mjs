import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home AI messages and composer stay compact until their content needs more room", async () => {
  const css = await read("app/globals.css");
  const drawer = await read("app/components/home-ai-drawer.tsx");
  assert.match(css, /\.home-ai-messages\{min-height:0;align-content:start\}/);
  assert.match(css, /\.home-ai-messages article\{align-self:start;height:max-content;max-width:84%/);
  assert.match(css, /\.home-ai-drawer-form textarea\{min-height:44px;height:44px;max-height:112px/);
  assert.match(drawer, /rows=\{1\}/);
  assert.match(drawer, /resizeComposer\(event\.currentTarget\)/);
  assert.match(drawer, /event\.key === "Enter" && !event\.shiftKey/);
});

test("Implementation questions use approved implementation guidance instead of unrelated excerpts", async () => {
  const knowledge = await read("app/lib/assistant-knowledge.ts");
  const customerAi = await read("app/lib/customer-ai.ts");
  const route = await read("app/api/assistant/chat/route.ts");
  assert.match(knowledge, /id: "kb-implementation"/);
  assert.match(customerAi, /customerAiImplementationAnswer/);
  assert.match(customerAi, /customerAiContextualQuery/);
  assert.match(customerAi, /\.filter\(\(\{ score \}\) => score >= 3\)/);
  assert.match(route, /implementationAnswer \|\| localAnswer/);
  assert.match(route, /retrieveCustomerAiKnowledge\(\s*managedKnowledge,\s*contextualQuery/s);
  assert.doesNotMatch(route, /!implementationAnswer && sources\.length/);
});

test("The signed-in account identity and its two-item menu are separate controls", async () => {
  const shell = await read("public/concept.html");
  const navigation = await read("public/navigation-content.js");
  const css = await read("public/version-72-stability.css");
  assert.match(shell, /<a class="header-account-link" id="headerAccountLink" href="\/account"/);
  assert.match(shell, /<button class="login login-menu-toggle" id="loginLink"/);
  assert.match(navigation, /accountLink\.hidden=false/);
  assert.match(navigation, /loginLink\.setAttribute\('aria-label',currentLang==='en'\?'Open account menu':'Хэрэглэгчийн цэс нээх'\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 300px\) 46px/);
  assert.doesNotMatch(css, /!important/);
});
