import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/concept.html", import.meta.url), "utf8");

test("core and connectors share one stable coordinate space", () => {
  const coreRule = source.match(/\.core\{[^}]+\}/)?.[0] || "";
  assert.match(coreRule, /transform:translate\(-50%,-50%\)/);
  assert.doesNotMatch(coreRule, /--mx|--my|translate3d/);
  assert.match(source, /cx=coreEl\.offsetLeft,cy=coreEl\.offsetTop/);
  assert.match(source, /sphereRadius=coreEl\.offsetWidth\*\(\.5-CORE_SPHERE_INSET\)/);
});

test("every connector overlaps both the sphere and its module", () => {
  assert.match(source, /CORE_SPHERE_INSET=\.1,CORE_LINK_OVERLAP=10,NODE_LINK_OVERLAP=5/);
  assert.match(source, /sx=cx\+ux\*\(sphereRadius-CORE_LINK_OVERLAP\)/);
  assert.match(source, /nodeInset=Math\.max\(0,edgeDistance-NODE_LINK_OVERLAP\)/);
  assert.match(source, /assertConnectorGeometry\(i,cx,cy,sphereRadius/);
});

test("geometry is recalculated after responsive and font layout changes", () => {
  assert.match(source, /new ResizeObserver\(\(\)=>scheduleGeometry\(false\)\)/);
  assert.match(source, /document\.fonts\?\.ready/);
  assert.match(source, /window\.visualViewport\?\.addEventListener\('resize'/);
  assert.match(source, /window\.addEventListener\('orientationchange'/);
  assert.match(source, /stable:paths\.length===modules\.length/);
});
