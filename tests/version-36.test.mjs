import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 36 keeps only the approved knowledge-center choices", () => {
  const concept = read("public/concept.html");
  for (const removed of [
    "Модулийн видео заавар", "Ажлын урсгалын жишээ", "PM ба PdM урсгал",
    "Үзлэгээс ажил үүсэх урсгал", "Сэлбэг ба агуулахын урсгал",
    "Модулийн Detail Flowchart", "Хэрэглэгчийн үүргээр", "Хийх ажлаар",
    "Модулиар судлах", "Системийн шинэчлэл",
  ]) assert.doesNotMatch(concept, new RegExp(removed));
  for (const retained of ["Системийн ерөнхий Flowchart", "Засварын ажлын үндсэн урсгал", "Анхлан ашиглах", "Facebook пост ба Reel"])
    assert.match(concept, new RegExp(retained));
});

test("version 36 places supplied visuals in their exact articles", () => {
  const supplements = read("public/detail-supplements.js");
  assert.match(supplements, /'product-0-0'.*unified-asset-register\.png/);
  assert.match(supplements, /'intro-1-0'.*system-flowchart\.png/);
  assert.ok(existsSync(new URL("../public/ibex-screens/unified-asset-register.png", import.meta.url)));
  assert.ok(existsSync(new URL("../public/ibex-flowcharts/system-flowchart.png", import.meta.url)));
});

test("version 36 applies one semantic outline icon system to menu items", () => {
  const concept = read("public/concept.html"), icons = read("public/menu-icons.js"), style = read("public/design-system.css");
  assert.match(concept, /menu-icons\.js/);
  assert.ok((concept.match(/ibexMenuIcon\(/g) || []).length >= 2);
  assert.match(icons, /stroke-width="1\.8"/);
  assert.match(icons, /function ibexMenuIcon\(/);
  assert.match(style, /\.menu-item-icon/);
});

test("version 36 keeps scroll behavior but hides redundant scrollbar chrome", () => {
  const globals = read("app/globals.css"), hub = read("public/admin-hub.css"), design = read("public/design-system.css");
  assert.match(globals, /html\.admin-hub-open/);
  assert.match(hub, /embedded-admin-hub \.admin-tabs/);
  assert.match(design, /scrollbar-width:\s*none/);
  assert.match(design, /::-webkit-scrollbar/);
});
