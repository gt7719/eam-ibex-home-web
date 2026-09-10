import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
function contentContext(){
 const html=read('concept.html'),context=vm.createContext({});
 vm.runInContext(html.slice(html.indexOf('const headerMenus='),html.indexOf('const menuExperience=')),context);
 vm.runInContext(read('detail-articles.js'),context);
 vm.runInContext(html.slice(html.indexOf('function flowStepData('),html.indexOf('function renderFlowStep(')),context);
 vm.runInContext('function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(String.fromCharCode(34),"&quot;");}',context);
 vm.runInContext(read('detail-supplements.js'),context);
 vm.runInContext(read('continuous-details.js').split('function renderContinuousDetail(')[0],context);
 return context;
}
test('all 49 approved content topics have distinct complete MN and EN articles',()=>{
 const context=contentContext();
 const result=vm.runInContext(`Object.entries(headerMenus).flatMap(([key,m])=>(m.groups||[]).flatMap((g,gi)=>g.items.map((item,ii)=>({id:key+'-'+gi+'-'+ii,article:detailArticles[key+'-'+gi+'-'+ii]}))))`,context);
 assert.equal(result.length,49);const seen=new Set();
 for(const {id,article} of result){assert.ok(article,id);for(const lang of ['mn','en']){assert.ok(article[lang].length>=2,id);assert.ok(article[lang].join(' ').length>180,id);if(lang==='en')assert.doesNotMatch(article[lang].join(' '),/[А-Яа-яӨөҮү]/);}
 assert.ok(!seen.has(article.mn.join(' ')),id);seen.add(article.mn.join(' '));}
 assert.equal(vm.runInContext('Object.keys(detailArticles).length',context),49);
 assert.doesNotMatch(read('detail-articles.js'),/addDetailGroup\('organization'/);
});
test('every detail is a continuous article without branching controls or dead media buttons',()=>{
 const context=contentContext();
 const ids=vm.runInContext('Object.keys(detailArticles)',context);
 for(const id of ids){const [key,g,i]=id.split('-');for(const en of [false,true]){
 const html=vm.runInContext(`continuousArticleMarkup(${JSON.stringify(key)},${g},${i},${en})`,context);
 assert.match(html,/<article class="continuous-article">/);
 assert.doesNotMatch(html,/<select|data-flow-step|generic-detail-card/);
 assert.equal((html.match(/<button/g)||[]).length,(html.match(/data-article-image/g)||[]).length);
 for(const [,file] of html.matchAll(/src="\/ibex-screens\/([^"]+)"/g))assert.ok(fs.existsSync(new URL('../public/ibex-screens/'+file,import.meta.url)));
 }}
 assert.equal((vm.runInContext("continuousArticleMarkup('intro',1,1,false)",context).match(/<img /g)||[]).length,8);
});
test('known content boundaries remain explicit and topic changes stay within the current dialog',()=>{
 const c=contentContext();
 assert.match(vm.runInContext("detailArticles['product-2-0'].mn.join(' ')",c),/Direct, Completed/);
 assert.match(vm.runInContext("detailArticles['product-2-1'].mn.join(' ')",c),/Predictive AI/);
 assert.match(vm.runInContext("detailArticles['intro-2-1'].mn.join(' ')",c),/туршилтын импорт/);
 assert.equal(vm.runInContext("detailArticles['intro-2-2']",c),undefined);
 assert.doesNotMatch(read('continuous-details.js'),/createElement\('select'\)|detailTopicSelect|fillDetailTopicSwitch/);
 assert.match(read('continuous-details.js'),/selection\.groupIndex,selection\.itemIndex/);
 assert.doesNotMatch(read('concept.html'),/function resourceCards|function resourceSteps|function approvedDetailLabels|Хязгааргүй ажиллагаа ба дэмжлэг|Unlimited operation and support/);
});
test('compact environment removes only duplicate chrome and retains functional preview controls',()=>{
 const js=read('organization-compact.js'),css=read('organization-compact.css'),modal=read('organization-modal.js');
 assert.match(css,/\.compact-organization \.site-head\{display:none\}/);
 assert.match(js,/\.intro>p:not\(\.eyebrow\),\.intro>small,\.preview-heading>strong/);
 assert.doesNotMatch(js,/state\.(users|assets|selected|locations)\s*=/);
 assert.match(js,/append\(compactHome\)/);
 assert.match(modal,/querySelector\('\.organization-home'\)\.onclick=.*ibex-reset-organization/);
 assert.match(modal,/querySelector\('\.organization-close'\)\.onclick=closeOrganization/);
 assert.match(css,/height:calc\(100dvh - var\(--org-footer-height,85px\)\)/);
 assert.match(read('organization-localization.js'),/function setPreviewLanguage/);
 assert.match(read('organization-localization.js'),/function setPreviewTheme/);
 assert.match(read('organization-preview.html'),/Урьдчилан харах загвар — бодит орчин үүсээгүй/);
});
test('new classic scripts and inline site script parse without syntax errors',()=>{
 for(const file of ['detail-articles.js','detail-supplements.js','continuous-details.js','organization-compact.js','organization-modal.js'])new vm.Script(read(file));
 for(const [,s]of read('concept.html').matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s);
});
test('selected articles survive language changes and return through their group without repeating the full index',()=>{
 const c=contentContext(),elements=new Map();
 function element(){return {hidden:false,textContent:'',innerHTML:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},append(){},appendChild(){},setAttribute(){},focus(){},showModal(){},close(){},scrollTop:0,getBoundingClientRect(){return {top:200,height:80}},scrollTo(){},querySelector(s){return get(s)},addEventListener(name,fn){this[name]=fn}};}
 function get(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}
 c.document={body:element(),createElement:element,getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 vm.runInContext(`const reduceMotion=true;let currentLang='mn',currentDetailMenu='product',currentDetailView='index',currentDetailFocus=-1,currentResourceSelection=null,currentFlowStep=null;const menuDetail={hidden:false};function syncDetailNavigation(){syncGroupedNavigation()};function renderDetailContent(){currentResourceSelection=null};function closeResourceDetail(){currentResourceSelection=null;currentDetailView='index'};function applyLanguage(){renderDetailContent(currentDetailMenu)};function renderSelectedDetail(k,g,i){renderContinuousDetail(k,g,i)}`,c);
 vm.runInContext(read('menu-icons.js'),c);
 vm.runInContext(read('navigation.js'),c);
 vm.runInContext(read('continuous-details.js'),c);
 vm.runInContext("renderContinuousDetail('product',0,0)",c);
 assert.match(get('detailContent').innerHTML,/Asset Core/);
 assert.doesNotMatch(get('detailContent').innerHTML,/data-nav-group|data-nav-topic/);
 assert.equal(vm.runInContext('currentDetailView',c),'resource');
 assert.equal(get('detailTitle').textContent,vm.runInContext('headerMenus.product.groups[0].items[0][0]',c));
 vm.runInContext("currentLang='en';applyLanguage()",c);
 assert.equal(vm.runInContext('currentResourceSelection.itemIndex',c),0);
 assert.doesNotMatch(get('detailContent').innerHTML,/[А-Яа-яӨөҮү]/);
 vm.runInContext("renderSelectedDetail('product',1,0)",c);
 assert.equal(vm.runInContext('currentResourceSelection.groupIndex',c),1);
 assert.equal(vm.runInContext('currentDetailMenu',c),'product');
 vm.runInContext('backGroupedNavigation()',c);
 assert.equal(vm.runInContext('currentResourceSelection',c),null);
 assert.equal((get('detailContent').innerHTML.match(/data-nav-topic=/g)||[]).length,4);
 vm.runInContext('backGroupedNavigation()',c);
 assert.equal(vm.runInContext('currentDetailView',c),'index');
 assert.equal(vm.runInContext('currentResourceSelection',c),null);
 assert.equal((get('detailContent').innerHTML.match(/data-nav-group=/g)||[]).length,6);
 vm.runInContext("renderContinuousDetail('ai',3,1);currentLang='mn';applyLanguage()",c);
 assert.equal(vm.runInContext('currentDetailMenu',c),'product');
 assert.equal(vm.runInContext('currentResourceSelection.key',c),'ai');
 assert.match(get('detailTitle').textContent,/Generative AI/);
 assert.match(get('detailKicker').textContent,/Ирээдүйн/);
});
test('inline layout preserves menu cards and supplements have truthful media placeholders',()=>{
 const c=contentContext();
 for(const id of vm.runInContext('Object.keys(detailArticles)',c)){
 const [k,g,i]=id.split('-');
 const out=vm.runInContext(`continuousArticleMarkup('${k}',${g},${i},false)`,c);
 assert.match(out,/Видео оруулна/);
 assert.doesNotMatch(out,/<video|<iframe|<select/);
 assert.equal((out.match(/<button/g)||[]).length,(out.match(/data-article-image/g)||[]).length);
 }
 assert.match(vm.runInContext("continuousArticleMarkup('product',2,0,false)",c),/<table|article-flow/);
 assert.doesNotMatch(read('continuous-details.css'),/reading-detail[^\n]*display:none/);
 assert.match(read('organization-modal.css'),/button\{cursor:pointer!important\}/);
 assert.match(read('organization-compact.js'),/querySelector\('\.preview-note'\)\?\.remove/);
 assert.match(read('organization-compact.js'),/append\(document.querySelector\('\.preview-label'\)\)/);
});
