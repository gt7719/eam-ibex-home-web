import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home AI no longer gates production responses on the approved knowledge set", async () => {
  const route = await read("app/api/assistant/chat/route.ts");
  const control = await read("app/api/admin/home-ai-control/route.ts");
  const customerAi = await read("app/lib/customer-ai.ts");
  const knowledge = await read("app/lib/assistant-knowledge.ts");
  assert.match(route, /if \(!guard\) \{/);
  assert.doesNotMatch(route, /Use only APPROVED EVIDENCE/);
  assert.doesNotMatch(route, /sources\.length && homeAiSettings\.mode/);
  assert.doesNotMatch(control, /approvedSources < 1/);
  assert.doesNotMatch(control, /Published Prompt ID, identity salt болон Approved/);
  assert.doesNotMatch(customerAi, /noKnowledgeAnswer/);
  assert.doesNotMatch(knowledge, /explains only approved public/);
});

test("Home AI uses general model knowledge and treats iBeX sources as optional references", async () => {
  const route = await read("app/api/assistant/chat/route.ts");
  const prompt = await read("app/lib/home-ai-prompt.ts");
  const publicWidget = await read("public/assistant-widget.js");
  const accountDrawer = await read("app/components/home-ai-drawer.tsx");
  assert.match(prompt, /general model knowledge/);
  assert.match(prompt, /not the only permitted knowledge source/);
  assert.match(route, /OPTIONAL IBEX REFERENCES/);
  assert.match(route, /used_source_ids/);
  assert.match(publicWidget, /OpenAI ерөнхий мэдлэг/);
  assert.match(accountDrawer, /OpenAI-ийн ерөнхий мэдлэг/);
});

test("production and admin tests use the same selected prompt mode without restoring the source gate", async () => {
  const route = await read("app/api/assistant/chat/route.ts");
  const testRoute = await read("app/api/admin/home-ai-control/test/route.ts");
  assert.match(route, /homeAiPromptRequest\(input\.settings, input\.lang\)/);
  assert.match(testRoute, /homeAiPromptRequest\(settings, "mn"\)/);
  assert.doesNotMatch(route, /Use only APPROVED EVIDENCE/);
  assert.doesNotMatch(testRoute, /Use only APPROVED EVIDENCE/);
});

test("OpenAI failures are explicit instead of silently returning the old local answer", async () => {
  const route = await read("app/api/assistant/chat/route.ts");
  const errors = await read("app/lib/home-ai-openai.ts");
  assert.match(route, /code: openAiError\.code/);
  assert.match(route, /status: `openai_error_\$\{openAiError\.code\.toLowerCase\(\)\}`/);
  assert.match(errors, /"OUTPUT_INCOMPLETE"/);
  assert.match(errors, /"PROMPT_NOT_FOUND"/);
  assert.match(errors, /"PROMPT_VERSION_INVALID"/);
  assert.doesNotMatch(route, /approved_fallback/);
});
