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
 vm.runInContext(read('continuous-details.js').split('const detailTopicLabel=')[0],context);
 return context;
}
test('all 60 approved content topics have distinct complete MN and EN articles',()=>{
 const context=contentContext();
 const result=vm.runInContext(`Object.entries(headerMenus).flatMap(([key,m])=>(m.groups||[]).flatMap((g,gi)=>g.items.map((item,ii)=>({id:key+'-'+gi+'-'+ii,article:detailArticles[key+'-'+gi+'-'+ii]}))))`,context);
 assert.equal(result.length,60);const seen=new Set();
 for(const {id,article} of result){assert.ok(article,id);for(const lang of ['mn','en']){assert.ok(article[lang].length>=2,id);assert.ok(article[lang].join(' ').length>180,id);if(lang==='en')assert.doesNotMatch(article[lang].join(' '),/[А-Яа-яӨөҮү]/);}
 assert.ok(!seen.has(article.mn.join(' ')),id);seen.add(article.mn.join(' '));}
 assert.equal(vm.runInContext('Object.keys(detailArticles).length',context),60);
 assert.doesNotMatch(read('detail-articles.js'),/addDetailGroup\('organization'/);
});
test('every detail is a continuous article without branching controls or dead media buttons',()=>{
 const context=contentContext();
 const ids=vm.runInContext('Object.keys(detailArticles)',context);
 for(const id of ids){const [key,g,i]=id.split('-');for(const en of [false,true]){
 const html=vm.runInContext(`continuousArticleMarkup(${JSON.stringify(key)},${g},${i},${en})`,context);
 assert.match(html,/<article class="continuous-article">/);
 assert.doesNotMatch(html,/<button|<select|data-flow-step|resource-card|generic-detail-card/);
 for(const [,file] of html.matchAll(/src="\/ibex-screens\/([^"]+)"/g))assert.ok(fs.existsSync(new URL('../public/ibex-screens/'+file,import.meta.url)));
 }}
 assert.equal((vm.runInContext("continuousArticleMarkup('intro',1,1,false)",context).match(/<img /g)||[]).length,8);
});
test('known content boundaries remain explicit and topic changes stay within the current dialog',()=>{
 const c=contentContext();
 assert.match(vm.runInContext("detailArticles['product-2-0'].mn.join(' ')",c),/Direct, Completed/);
 assert.match(vm.runInContext("detailArticles['product-2-1'].mn.join(' ')",c),/Predictive AI/);
 assert.match(vm.runInContext("detailArticles['intro-2-1'].mn.join(' ')",c),/туршилтын импорт/);
 assert.match(vm.runInContext("detailArticles['intro-2-5'].mn.join(' ')",c),/өөр зориулалттай/);
 assert.match(read('continuous-details.js'),/renderSelectedDetail\(currentDetailMenu,g,i\)/);
 assert.match(read('continuous-details.js'),/selection\.groupIndex,selection\.itemIndex/);
 assert.doesNotMatch(read('concept.html'),/function resourceCards|function resourceSteps|function approvedDetailLabels|Хязгааргүй ажиллагаа ба дэмжлэг|Unlimited operation and support/);
});
test('compact environment removes only duplicate chrome and retains functional preview controls',()=>{
 const js=read('organization-compact.js'),css=read('organization-compact.css'),modal=read('organization-modal.js');
 assert.match(css,/\.compact-organization \.site-head\{display:none\}/);
 assert.match(js,/\.intro>p:not\(\.eyebrow\),\.intro>small,\.preview-heading>strong/);
 assert.doesNotMatch(js,/state\.(users|assets|selected|locations)\s*=/);
 assert.match(js,/append\(compactHome\)/);
 assert.match(modal,/querySelector\('\.organization-home'\)\.onclick=closeOrganization/);
 assert.match(modal,/querySelector\('\.organization-close'\)\.onclick=closeOrganization/);
 assert.match(css,/height:calc\(100dvh - var\(--org-footer-height,85px\)\)/);
 assert.match(read('organization-localization.js'),/function setPreviewLanguage/);
 assert.match(read('organization-localization.js'),/function setPreviewTheme/);
 assert.match(read('organization-preview.html'),/Урьдчилан харах загвар — бодит орчин үүсээгүй/);
});
test('new classic scripts and inline site script parse without syntax errors',()=>{
 for(const file of ['detail-articles.js','continuous-details.js','organization-compact.js','organization-modal.js'])new vm.Script(read(file));
 for(const [,s]of read('concept.html').matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s);
});
test('selected articles survive language changes, switch topics and return to the index',()=>{
 const c=contentContext(),elements=new Map();
 function element(){return {hidden:false,textContent:'',innerHTML:'',value:'',classList:{add(){},remove(){},toggle(){}},append(){},setAttribute(){},scrollTo(){},querySelector(s){return get(s)},addEventListener(name,fn){this[name]=fn}};}
 function get(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}
 c.document={createElement:element,getElementById:get,querySelector:get,querySelectorAll:()=>[]};
 vm.runInContext(`let currentLang='mn',currentDetailMenu='product',currentDetailView='index',currentDetailFocus=-1,currentResourceSelection=null,currentFlowStep=null;const menuDetail={hidden:false};function syncDetailNavigation(){};function renderDetailContent(){currentResourceSelection=null};function closeResourceDetail(){currentResourceSelection=null;currentDetailView='index'};function applyLanguage(){renderDetailContent(currentDetailMenu)};function renderSelectedDetail(k,g,i){renderContinuousDetail(k,g,i)}`,c);
 vm.runInContext(read('continuous-details.js'),c);
 vm.runInContext("renderContinuousDetail('product',0,0)",c);
 assert.match(get('resourceInline').innerHTML,/Asset Core/);
 vm.runInContext("currentLang='en';applyLanguage()",c);
 assert.equal(vm.runInContext('currentResourceSelection.itemIndex',c),0);
 assert.doesNotMatch(get('resourceInline').innerHTML,/[А-Яа-яӨөҮү]/);
 get('select').value='1:0';get('select').change();
 assert.equal(vm.runInContext('currentResourceSelection.groupIndex',c),1);
 assert.equal(vm.runInContext('currentDetailMenu',c),'product');
 vm.runInContext('closeResourceDetail()',c);
 assert.equal(vm.runInContext('currentDetailView',c),'index');
 assert.equal(vm.runInContext('currentResourceSelection',c),null);
});
