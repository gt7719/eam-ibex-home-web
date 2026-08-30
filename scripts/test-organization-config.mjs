import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const nodes=new Map();
function element(id){if(!nodes.has(id)){const events={},classes=new Set();nodes.set(id,{innerHTML:'',textContent:'',dataset:{},events,classList:{contains:key=>classes.has(key),toggle(key,force){const enabled=force??!classes.has(key);enabled?classes.add(key):classes.delete(key);return enabled;}},addEventListener(type,fn,capture){(events[type]??=[]).push({fn,capture});},append(){},insertAdjacentHTML(){},scrollIntoView(){}});}return nodes.get(id);}
const document={getElementById:element,querySelector:element,querySelectorAll:()=>[],createTreeWalker:()=>({nextNode:()=>null}),body:element('body'),documentElement:{}};
const ctx=vm.createContext({document,console,URL,NodeFilter:{SHOW_TEXT:4}});
for(const file of ['organization-preview.js','organization-enhancements.js','organization-localization.js'])vm.runInContext(fs.readFileSync(`public/${file}`,'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
// Real delegated button handler: multiple rows survive rendering and navigation.
run('state.step=1');
const addButton={dataset:{},hasAttribute:name=>name==='data-add-location'};
for(let i=0;i<2;i++)for(const {fn} of element('steps').events.click)fn({target:{closest:()=>addButton}});
assert.equal(run('state.locations.length'),3);
assert.match(run('body(1)'),/data-location="2"/);
run("state.locations[2]='QA Branch';move(2);move(1)");
assert.equal(run('state.locations[2]'),'QA Branch');
function change(target){for(const {fn} of element('steps').events.change)fn({target});}
assert.equal(run("suggestedEmail('Алтай Майнинг')"),'admin@altaimaining.mn');
assert.equal(run("suggestedEmail('')"),'');
run("state.emailEdited=true;state.email='admin@company.mn';state.org='Өөр нэр';synchronize()");
assert.equal(run('state.email'),'admin@company.mn');
run('state.emailEdited=false;synchronize()');assert.equal(run('state.email'),'admin@oorner.mn');
change({dataset:{multi:'assets'},value:'Хөдөлгүүр',checked:true});
assert.equal(run('state.assetTypes.size'),2);assert.equal(run('state.assets'),50);
assert.match(run('workContent()'),/Хөдөлгүүр/);
change({dataset:{multi:'sources'},value:'Цаасан бүртгэл',checked:true});assert.equal(run('state.sources.size'),2);
assert.match(run('summary(6)'),/Хосолсон/);
change({dataset:{multi:'sources'},value:'Шинээр эхлэх',checked:true});assert.equal(run('state.sources.size'),1);
change({dataset:{multi:'sources'},value:'Excel',checked:true});assert.equal(run("state.sources.has('Шинээр эхлэх')"),false);
change({dataset:{group:'mytask'},checked:true});assert.equal(run("childMenus.mytask.filter(x=>state.selected.has(x[0])).length"),6);
change({dataset:{option:'my_tasks'},checked:false});assert.equal(run("childMenus.mytask.filter(x=>state.selected.has(x[0])).length"),5);
assert.equal(run("state.selected.has('mytask')"),true);
change({dataset:{group:'mytask'},checked:false});assert.equal(run("state.selected.has('mytask')"),false);
change({dataset:{group:'location'},checked:false});assert.equal(run("state.selected.has('assets')&&state.selected.has('requests')&&state.selected.has('open')&&state.selected.has('closed')"),true);
assert.equal(run("state.selected.has('language')&&state.selected.has('appearance')"),true);
for(let i=0;i<8;i++){assert.ok(run(`body(${i}).length`)>0);}
run("state.step=2;state.assetTypes.clear()");assert.equal(run('valid()'),false);
run("state.assetTypes.add('Насос');state.step=6;state.sources.clear()");assert.equal(run('valid()'),false);
run("state.sources.add('Excel');toggleLanguage()");assert.equal(run('state.lang'),'en');
assert.match(run('summary(2)'),/assets/);
run('toggleLanguage()');assert.equal(run('state.lang'),'mn');
run("setPreviewLanguage('en')");assert.equal(run('state.lang'),'mn');assert.equal(run('state.previewLang'),'en');
run("setPageLanguage('en')");assert.equal(run('state.lang'),'en');assert.equal(run('state.previewLang'),'en');
run("setPreviewLanguage('mn')");assert.equal(run('state.lang'),'en');assert.equal(run('state.previewLang'),'mn');
run('setPreviewTheme(true)');assert.equal(run('state.previewDay'),true);
assert.equal(document.body.classList.contains('day'),false);
assert.equal(element('workspace').classList.contains('preview-night'),false);
run('setPageTheme(true);setPreviewTheme(false)');
assert.equal(document.body.classList.contains('day'),true);
assert.equal(element('workspace').classList.contains('preview-night'),true);
run('setPageTheme(false)');assert.equal(run('state.previewDay'),false);
run("setPageLanguage('en');state.org='Насос';state.user='Баг';state.team='Төсөв';state.locations=['Барилга'];state.step=7");
assert.match(run('body(7)'),/data-user>Насос/);
assert.match(run('body(7)'),/data-user>Барилга/);
assert.match(run('body(7)'),/Package rules and prices/);
run("state.view='settings'");assert.match(run('workContent()'),/data-user>Баг/);
assert.match(run('workContent()'),/User/);
// Every generated step's interface text must have an English translation.
// data-user blocks are deliberately excluded: names and addresses are not UI copy.
const untranslated=[];
for(let step=0;step<8;step++){
 const html=run(`body(${step})`).replace(/<([a-z]+)\b[^>]*data-user[^>]*>[\s\S]*?<\/\1>/g,'');
 for(const match of html.matchAll(/>([^<>]+)</g)){
  const value=match[1].trim();if(!value)continue;
  const translated=run(`localText(${JSON.stringify(value)},'en')`);
  if(/[А-Яа-яӨөҮүЁё]/.test(translated))untranslated.push({step:step+1,value});
 }
}
assert.deepEqual(untranslated,[],'Untranslated interface labels');
run("state.previewLang='en';state.locations=['Test site'];state.org='Test org';state.user='Test user';state.team='Test team'");
for(const id of run('catalog.map(x=>x[0])')){
 run(`state.view=${JSON.stringify(id)}`);
 const html=run('workContent()').replace(/<([a-z]+)\b[^>]*data-user[^>]*>[\s\S]*?<\/\1>/g,'');
 assert.ok(!/[А-Яа-яӨөҮүЁё]/.test(html),`Untranslated preview ${id}`);
}
for(const id of ['cost','work','task','monitor']){
 run(`state.view='dashboard';state.dash.add('${id}');state.dashboard='${id}'`);
 assert.ok(!/[А-Яа-яӨөҮүЁё]/.test(run('workContent()')),`Untranslated dashboard ${id}`);
}
assert.equal(run('catalog.length'),run('new Set(catalog.map(x=>x[0])).size'));
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|localStorage/.test(fs.readFileSync('public/organization-enhancements.js','utf8')));
console.log('PASS: menu groups, mandatory items, multi-select, email, validation, language, sample assets, no network.');
