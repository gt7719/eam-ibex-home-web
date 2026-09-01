import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('public pricing has persistent BUY actions and MNT monthly/annual checkout',()=>{
  const script=read('public/post-v30-controls.js'),style=read('public/post-v30.css');
  assert.match(script,/BUY · ХУДАЛДАН АВАХ/);
  assert.match(script,/Сараар/);
  assert.match(script,/Жилээр/);
  assert.match(script,/Үнийг MNT-ээр харуулна/);
  assert.match(style,/\.detail-plan>\.plan-select\{flex:0 0 auto/);
  assert.match(style,/\.detail-plan>\.plan-scope\{flex:1/);
});

test('checkout offers card QR bank app transfer and other methods without inventing links',()=>{
  const script=read('public/post-v30-controls.js');
  for(const id of ['card','qr','bank_app','transfer','other'])assert.match(script,new RegExp(`id:'${id}'`));
  assert.match(script,/БАНКНЫ ХОЛБООС ТОХИРУУЛААГҮЙ/);
  assert.match(script,/method\.checkoutUrl/);
  assert.match(script,/id="paymentDetail"/);
  assert.match(script,/payment-hosted-frame/);
  assert.match(script,/Картын дугаар болон CVV-г iBeX вебсайт хадгалахгүй/);
  assert.match(script,/Зөвхөн холбогдсон банк эсвэл gateway-ээс ирсэн бодит QR-г харуулна/);
});

test('pricing and social content controls are permission-gated admin surfaces',()=>{
  const admin=read('app/admin/page.tsx'),hub=read('public/post-v31-admin-hub.js'),concept=read('public/concept.html'),payments=read('app/api/admin/payment-settings/route.ts'),social=read('app/api/admin/social-content/route.ts');
  assert.doesNotMatch(admin,/href="\/admin\/pricing"/);
  assert.doesNotMatch(admin,/href="\/admin\/assistant"/);
  assert.doesNotMatch(admin,/href="\/admin\/social"/);
  assert.match(concept,/pricing:'pricing\.manage'/);
  assert.match(hub,/knowledge:'knowledge\.manage'/);
  assert.match(hub,/social:'social\.manage'/);
  assert.match(payments,/hasAdminPermission\(user, "pricing\.manage"\)/);
  assert.match(social,/hasAdminPermission\(user,'social\.manage'\)/);
});

test('all five content areas share one internal permission-aware tab row',()=>{
  const hub=read('public/post-v31-admin-hub.js'),concept=read('public/concept.html');
  assert.match(hub,/\['partners','people','pricing','knowledge','social'\]/);
  assert.match(hub,/admin-embedded-frame/);
  assert.match(concept,/post-v31-admin-hub\.js/);
});

test('public pricing admin affordance stays hidden and scroll-to-top avoids actions',()=>{
  const script=read('public/post-v30-controls.js'),style=read('public/post-v30.css');
  assert.match(script,/megaAdmin\.hidden=true/);
  assert.match(script,/detail-footer-action, #detailContent \.payment-panel/);
  assert.match(style,/\.detail-top\.avoid-actions\{bottom:/);
});
