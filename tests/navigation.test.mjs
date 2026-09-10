import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');
test('condensed groups retain all 49 approved articles exactly once in MN and EN with unique icons', () => {
  const context = vm.createContext({ document: { getElementById: () => ({ addEventListener() {} }) } });
  const html = read('concept.html');
  vm.runInContext(html.slice(html.indexOf('const headerMenus='), html.indexOf('const menuExperience=')), context);
  vm.runInContext(read('menu-icons.js'), context);
  vm.runInContext(read('navigation.js'), context);
  const result = vm.runInContext(`(() => {
    const expected = Object.entries(headerMenus).flatMap(([key, menu]) => (menu.groups || []).flatMap((group, gi) => group.items.map((_, ii) => [key, gi, ii].join('-'))));
    const actual = [], issues = [];
    for (const [root, menu] of Object.entries(ibexNavigation)) {
      const icons = menu.groups.map(group => group.icon);
      if (new Set(icons).size !== icons.length || icons.some(icon => !ibexMenuIconPaths[icon])) issues.push(root + ': icons');
      for (const group of menu.groups) {
        if (!group.mn || !group.en) issues.push(group.id + ': labels');
        const topicIcons = [];
        for (const [key, gi, indices] of group.sources) for (const ii of indices) {
          actual.push([key, gi, ii].join('-'));
          if (!headerMenus[key]?.groups[gi]?.items[ii] || !headerMenusEN[key]?.groups[gi]?.items[ii]) issues.push(key + ': missing');
          topicIcons.push(ibexMenuIconName(key, gi, ii));
        }
        if (new Set(topicIcons).size !== topicIcons.length || topicIcons.some(icon => !icon)) issues.push(group.id + ': topic icons');
      }
    }
    return { expected: expected.sort(), actual: actual.sort(), issues, counts: Object.values(ibexNavigation).map(menu => menu.groups.length) };
  })()`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(result.actual)), JSON.parse(JSON.stringify(result.expected)));
  assert.equal(result.actual.length, 49);
  assert.deepEqual([...result.counts], [6, 5, 4]);
  assert.deepEqual([...result.issues], []);
  assert.equal((html.match(/class="menu-trigger"/g) || []).length, 4);
  assert.match(html, /class="organization-link" href="\/organization" target="_top"/);
  assert.match(html, /data-menu="pricing"/);
  for (const name of ['navigation.js', 'launch-offer.js']) new vm.Script(read(name));
});
