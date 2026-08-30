import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('organization entry follows pricing without changing existing menu triggers',()=>{
  const html=read('public/concept.html');
  const nav=html.slice(html.indexOf('<nav class="nav"'),html.indexOf('</nav>'));
  assert.ok(nav.indexOf('data-menu="pricing"')<nav.indexOf('href="/organization"'));
  assert.ok(nav.indexOf('href="/organization"')<nav.indexOf('data-menu="intro"'));
  assert.equal((nav.match(/class="menu-trigger"/g)||[]).length,6);
  assert.match(nav,/class="organization-link" href="\/organization" target="_top"/);
  assert.match(read('app/organization/page.tsx'),/src="\/organization-preview.html"/);
});
test('integrated configurator has all local assets, home exit and explicit preview boundary',()=>{
  const html=read('public/organization-preview.html');
  for(const [,asset] of html.matchAll(/(?:src|href)="\/(organization-[^"]+)"/g))assert.ok(read('public/'+asset));
  assert.match(html,/href="\/" target="_top"/);
  assert.match(html,/Бодит байгууллага үүсгэхгүй/);
  for(const name of ['organization-preview.js','organization-enhancements.js','organization-localization.js','organization-site-integration.js']){
    assert.doesNotMatch(read('public/'+name),/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  }
});
test('global preferences roundtrip, local preview preferences remain isolated',()=>{
  const values=new Map([['ibex-lang','en'],['ibex-theme','day']]);
  const context=vm.createContext({words:{},reverseWords:{},state:{},localStorage:{getItem:key=>values.get(key),setItem:(k,v)=>values.set(k,v)}});
  vm.runInContext('function setPageLanguage(lang){state.lang=lang;state.previewLang=lang;} function setPageTheme(day){state.day=day;state.previewDay=day;} function setPreviewLanguage(lang){state.previewLang=lang;} function setPreviewTheme(day){state.previewDay=day;}',context);
  vm.runInContext(read('public/organization-site-integration.js'),context);
  assert.equal(context.state.lang,'en');assert.equal(context.state.day,true);
  vm.runInContext("setPreviewLanguage('mn');setPreviewTheme(false)",context);
  assert.equal(values.get('ibex-lang'),'en');assert.equal(values.get('ibex-theme'),'day');
  vm.runInContext("setPageLanguage('mn');setPageTheme(false)",context);
  assert.equal(values.get('ibex-lang'),'mn');assert.equal(values.get('ibex-theme'),'night');
  assert.equal(values.size,2);
});
