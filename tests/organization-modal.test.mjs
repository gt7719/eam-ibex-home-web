import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('native modal preserves the iframe and validates child message identity',()=>{const s=read('organization-modal.js');assert.match(s,/showModal\(\)/);assert.match(s,/addEventListener\('cancel'/);assert.match(s,/e.target===organizationDialog/);assert.match(s,/!organizationFrame.hasAttribute\('src'\)/);assert.match(s,/e.origin!==location.origin/);assert.match(s,/e.source===organizationFrame.contentWindow/);assert.doesNotMatch(s,/removeChild|organizationFrame.remove\(|organizationFrame.src=''/);});
test('admin wizard keeps stage controls visible and restores only to drafts',()=>{assert.match(read('package-admin.css'),/footer\{position:fixed/);assert.match(read('package-admin.mjs'),/save\('restore'/);assert.match(read('package-admin.mjs'),/checked.size<5/);assert.match(read('package-admin.mjs'),/i=step;i<5/);});
