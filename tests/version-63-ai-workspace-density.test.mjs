import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("AI administration removes duplicate summary chrome and starts work below the sub-tabs", () => {
  const page = readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const style = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const section = page.match(/activeSection\?\.id === "ai"[\s\S]*?<\/div> : activeSection/)?.[0] || "";
  assert.match(section, /<nav className="ai-admin-tabs"/);
  assert.match(section, /<iframe className="ai-admin-frame"/);
  assert.doesNotMatch(section, /AI MANAGEMENT|AI удирдлага/);
  assert.match(style, /Version 63: remove duplicate AI heading/);
  assert.match(style, /\.admin-ai-workspace > \.ai-admin-frame \{ margin-top:0;/);
});
