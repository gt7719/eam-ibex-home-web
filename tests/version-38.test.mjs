import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("version 38 replaces editable image URLs with direct single and multiple image selection", () => {
  const social = read("app/admin/social/page.tsx");
  const concept = read("public/concept.html");

  assert.match(social, /fetch\("\/api\/admin\/media"/);
  assert.match(social, /type="file" accept="image\/\*"/);
  assert.match(social, /type="file" accept="image\/\*" multiple/);
  assert.match(social, /onDrop=\{imageDrop/);
  assert.match(social, /imageCaptionMn/);
  assert.match(social, /imageCaptionEn/);
  assert.match(social, /captionMn/);
  assert.match(social, /captionEn/);
  assert.doesNotMatch(social, /Нүүр зургийн HTTPS холбоос|Cover-image HTTPS URL|Зургийн холбоос|Image URL/);

  assert.match(concept, /data-upload-field/);
  assert.match(concept, /data-media-drop/);
  assert.match(concept, /type="hidden" data-field="\$\{field\}"/);
  assert.match(concept, /logoAltMn/);
  assert.match(concept, /photoAltEn/);
  assert.doesNotMatch(concept, /Зургийн URL эсвэл файл|Image URL or file/);
});

test("version 38 keeps the partner descriptions aligned as one bilingual row", () => {
  const concept = read("public/concept.html");
  const design = read("public/design-system.css");

  assert.match(concept, /<div class="admin-copy-pair">\$\{adminTextarea\(a\.descriptionMn/);
  assert.match(concept, /adminTextarea\(a\.descriptionEn,'descriptionEn',p\.descriptionEn,'partner'\)\}<\/div>/);
  assert.match(design, /\.admin-copy-pair\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-template-columns:\s*repeat\(2/s);
  assert.match(design, /@media \(max-width:\s*680px\)[\s\S]*\.admin-copy-pair\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test("version 38 removes scrolling from the administrator session controls", () => {
  const css = read("app/globals.css");
  const workspace = css.match(/\.admin-workspace\s*\{([^}]*)\}/s)?.[1] || "";
  const session = css.match(/\.admin-session-bar\s*\{([^}]*)\}/s)?.[1] || "";

  assert.match(workspace, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
  assert.match(session, /flex-wrap:\s*wrap/);
  assert.match(session, /overflow:\s*visible/);
  assert.doesNotMatch(session, /overflow-[xy]:\s*auto|overflow:\s*auto/);
});

test("version 38 preserves uploaded media paths and bilingual gallery captions", () => {
  const api = read("app/api/admin/social-content/route.ts");
  const publicDetails = read("public/continuous-details.js");

  assert.match(api, /\/api\\\/media/);
  assert.match(api, /galleryImages/);
  assert.match(api, /captionMn/);
  assert.match(api, /captionEn/);
  assert.match(publicDetails, /row\.galleryImages/);
  assert.match(publicDetails, /image\.captionEn/);
  assert.match(publicDetails, /figcaption/);
});
