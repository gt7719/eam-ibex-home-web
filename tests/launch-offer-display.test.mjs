import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('active offer appears in both pricing headers, changes language and clears on other menus', () => {
  const nodes = [];
  const header = { append(node) { nodes.push(node); } };
  const context = vm.createContext({
    document: {
      querySelectorAll: selector => selector.startsWith('.launch-offer') ? [...nodes] : [],
      querySelector: () => header,
      createElement: () => ({ remove() { nodes.splice(nodes.indexOf(this), 1); } }),
      addEventListener() {},
    },
    megaMenu: { querySelector: () => header, classList: { toggle() {} } },
    pricingPlans: [{ id: 'basic', name: 'Basic', enabled: true }],
    currentLang: 'mn', activeHeaderMenu: 'pricing', currentDetailMenu: '',
    renderHeaderMenu() {}, renderDetailContent() {}, esc: value => value,
    clearTimeout() {}, setTimeout() {}, setInterval() {},
    fetch: () => new Promise(() => {}), window: { addEventListener() {} },
  });
  vm.runInContext(fs.readFileSync(new URL('../public/launch-offer.js', import.meta.url), 'utf8'), context);
  vm.runInContext(`launchOffer = { startsAt: 0, expiresAt: Date.now()+60000, scope:'all', badgeMn:'3 сар үнэгүй', badgeEn:'3 months free', textMn:'3 сар үнэгүй', textEn:'3 months free' }; renderHeaderMenu('pricing');`, context);
  assert.match(nodes[0].innerHTML, /3 сар үнэгүй/);
  vm.runInContext(`launchOffer.startsAt=Date.now()+30000; launchOffer.startDate='2026-10-01'; renderHeaderMenu('pricing');`, context);
  assert.match(nodes[0].innerHTML, /2026-10-01 өдрөөс эхэлнэ/);
  vm.runInContext(`currentLang='en'; activeHeaderMenu=''; currentDetailMenu='pricing'; renderDetailContent('pricing');`, context);
  assert.equal(nodes.length, 1);
  assert.match(nodes[0].innerHTML, /3 months free/);
  assert.match(nodes[0].innerHTML, /Starts on 2026-10-01/);
  vm.runInContext(`currentDetailMenu='product'; renderDetailContent('product');`, context);
  assert.equal(nodes.length, 0);
});
