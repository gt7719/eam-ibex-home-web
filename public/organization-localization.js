'use strict';
// Page controls reset both surfaces; preview controls affect only the workspace.
state.previewLang=state.lang;
state.previewDay=document.body.classList.contains('day');
Object.assign(words,{
 'Цэс дарж үзэх нь багцын сонголтыг өөрчлөхгүй. График, ажлын мөрүүд нь зөвхөн жишээ өгөгдөл.':'Preview navigation does not change your package choices. Charts and work rows use sample data only.',
 'PNG, JPG, WebP · 5 MB хүртэл · зөвхөн энэ загварт ашиглана.':'PNG, JPG, WebP · Up to 5 MB · Used in this prototype only.',
 '＋ Байршил нэмэх':'＋ Add location',
 'Эхний загварт сонгосон цэсүүд бүх байршилд ижил үйлчилнэ.':'In this prototype, selected menus apply equally to all locations.',
 'Үүрэг: хүсэлт гаргагч, талбайн ажилтан, төлөвлөгч, багийн ахлагч, админ. Энэ нь бодит эрх олголт биш.':'Roles: requester, field worker, planner, team leader and admin. This does not grant real permissions.',
 'Dashboard нь сонголтот. Бодит өгөгдөл, модуль болон багцын хамаарлыг дараагийн шатанд батална.':'Dashboards are optional. Data, module and package dependencies will be confirmed later.',
 'Төсөв, сэлбэг болон нэгдсэн гүйлгээг харна.':'View budgets, parts and consolidated transactions.',
 'Бүх байршлын агуулахыг нэгтгэн харна.':'View warehouses across all locations.',
 'Бүх байршлын орлогыг нэгтгэн харна.':'View receipts across all locations.',
 'Бүх байршлын зарлагыг нэгтгэн харна.':'View issues across all locations.',
 'Ажлуудын нэгдсэн хэсэг':'Consolidated work',
 'Нөхцөл баталгаажуулах шаардлагатай':'Conditions require approval',
 'Байгууллагын нэрээ оруулна уу.':'Enter the organization name.',
 'Байршил бүрийн нэрийг оруулна уу.':'Enter a name for every location.',
 'Байршлын нэр давхардаж байна.':'Location names must be unique.',
 'Хөрөнгийн тоо 1–1,000,000 бүхэл тоо байна.':'Enter a whole asset count from 1 to 1,000,000.',
 'Хэрэглэгчийн нэр, тоог зөв оруулна уу.':'Enter a user name and a valid user count.',
 'PNG, JPG эсвэл WebP зураг 5 MB-аас бага байна.':'Choose a PNG, JPG or WebP image no larger than 5 MB.',
 'Хөрөнгийн төрлөөс сонгоно уу.':'Select at least one asset type.',
 'Бүртгэлийн хэлбэрээс сонгоно уу.':'Select at least one record type.',
 'Админы и-мэйл хаягийг зөв оруулна уу.':'Enter a valid admin email.',
 'Бүртгэл / хөрөнгийн сонголт шинэчлэгдсэн':'Records / assets updated',
 'Цэсний сонголт шинэчлэгдсэн':'Menu selection updated',
 'Багцын дүрэм батлагдсаны дараа үнэ тооцно.':'Pricing awaits approved package rules.',
 'Үндсэн цэс':'Main navigation','Лого — Dashboard':'Logo — Dashboard','Салбарын хөрөнгө':'Location assets',
 'Орчны тохируулагч':'Environment configurator','Жагсаалт':'List','Мод':'Tree','Байршил':'Location','Хөрөнгийн код':'Asset code','Нэр':'Name','Код':'Code','Төлөв':'Status',
 'Төлөвлөгөөт засвар':'Planned maintenance','Төлөвлөгдөөгүй засвар':'Unplanned maintenance','Хүсэлт':'Request','Дууссан ажил':'Completed work','Нийт даалгавар':'Total tasks','Явцтай':'In progress','Дууссан':'Completed','Баг':'Team','Хэмжилт':'Readings','Хугацаа':'Period','Өгөгдөл':'Data','Засварын зардал':'Maintenance costs','Сэлбэгийн зардал':'Parts costs','Ажиллах хүч':'Labor',
 'Хөрөнгө хайх':'Search assets','Хөрөнгийн нэр, кодоор хайх':'Search name or code','Жишээ бүрэлдэхүүн':'Sample component','Жишээ':'Sample','Илэрц алга':'No results',
 'Жишээ график — бодит өгөгдөл биш':'Sample chart — not real data',
 'Жишээ өгөгдөл — байгууллагын бодит үр дүн биш. Мониторинг нь техникийн үзүүлэлт; үйлдвэрлэл удирдах систем биш.':'Sample data, not actual organization results. Monitoring shows technical readings; it is not a production control system.',
 'Dashboard сонгоогүй байна. Баруун талын 6-р алхмаар сонгоно.':'No dashboard selected. Choose dashboards in step 6 on the right.',
 'Энэ хүснэгт сонгосон цэсний харагдах загвар. Бодит бүртгэл биш.':'This table previews the selected menu. It contains no real records.',
 'Тохиргооны цэс бүх багцад байна. Бодит эрх олголт хийгдээгүй.':'Settings are included in all packages. No real permissions have been granted.',
 'Шинэ хүсэлт':'New request','Хэрэглэгч':'User','Админы и-мэйл':'Admin email',
 'Байршил → Хөрөнгө → Доголдлын тайлбар → Хавсралт':'Location → Asset → Fault description → Attachment',
 'Энэ нь хүсэлт үүсгэх урсгалын жишээ. Бодит хүсэлт илгээхгүй.':'This previews the request flow. No real request is submitted.',
 'Тусгай шаардлагыг iBeX багтай хянуулна.':'Review custom requirements with the iBeX team.',
 'Стандарт орчны хувилбарыг хянана.':'Review the standard environment approach.',
 'Байршил, хөрөнгө, хэрэглэгчийн үндсэн мэдээллээ бэлтгэнэ.':'Prepare your core location, asset and user data.',
 'Эх бүртгэлээ хадгалж, талбарын зураглал хийж, жижиг түүврээр импорт туршина.':'Keep source records, map fields and test imports with a small sample.',
 'Жишээ өгөгдөл бодит орчинд шилжихгүй.':'Sample data will not transfer to a real environment.',
 'Энэ товч нь захиалга, төлбөр эсвэл байгууллага үүсгэхгүй. Хуудсыг шинэчлэхэд ноорог арилна.':'This button does not create an order, payment or organization. Reloading clears the draft.',
 'Загварын хураангуйг хянасан ✓':'Prototype review confirmed ✓'
});
const reverseWords=Object.fromEntries(Object.entries(words).map(([mn,en])=>[en,mn]));
function ui(text,lang=state.lang){const key=reverseWords[text]||text;return lang==='en'?(words[key]||key):key;}
function localText(text,lang){if(words[text]||reverseWords[text])return ui(text,lang);const patterns=[[/^Байршил (\d+)$/,'Location $1'],[/^Байршлын нэр (\d+)$/,'Location name $1'],[/^Байршил (\d+) хасах$/,'Remove location $1']];if(lang==='en'){for(const [re,replacement] of patterns)if(re.test(text))return text.replace(re,replacement);}else{if(/^Location \d+$/.test(text))return text.replace('Location','Байршил');if(/^Location name \d+$/.test(text))return text.replace('Location name','Байршлын нэр');if(/^Remove location \d+$/.test(text))return text.replace(/^Remove location (\d+)$/,'Байршил $1 хасах');}return text;}
const textSources=new WeakMap(),attributeSources=new WeakMap();
translate=function(){
 document.getElementById('language').textContent=state.lang==='mn'?'MN / EN':'EN / MN';
 document.querySelectorAll('option').forEach(o=>{if(!o.hasAttribute('value'))o.setAttribute('value',o.textContent);});
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  if(node.parentElement.closest('script,style,input,textarea,[data-user],.org-name,.avatar,.side-nav summary,.step-summary'))continue;
  const raw=node.nodeValue.trim();if(!raw)continue;const saved=textSources.get(node);const source=saved&&saved.last===raw?saved.source:raw;const lang=node.parentElement.closest('#workspace')?state.previewLang:state.lang;
  const translated=localText(source,lang);textSources.set(node,{source,last:translated});node.nodeValue=node.nodeValue.replace(raw,translated);
 }
 document.querySelectorAll('[aria-label],[placeholder],img[alt]').forEach(el=>{
  if(el.closest('[data-user],.avatar'))return;
  const lang=el.closest('#workspace')?state.previewLang:state.lang;const saved=attributeSources.get(el)||{};
  for(const attr of ['aria-label','placeholder','alt']){if(!el.hasAttribute(attr))continue;const raw=el.getAttribute(attr);const old=saved[attr];const source=old&&old.last===raw?old.source:raw;const translated=localText(source,lang);el.setAttribute(attr,translated);saved[attr]={source,last:translated};}attributeSources.set(el,saved);
 });
};
function setPageLanguage(lang){state.lang=lang;state.previewLang=lang;document.documentElement.lang=lang;state.lastChange=ui(state.lastChange,lang);renderSteps();renderWorkspace();translate();}
function setPreviewLanguage(lang){state.previewLang=lang;renderWorkspace();}
function setPageTheme(day){document.body.classList.toggle('day',day);state.previewDay=day;renderWorkspace();}
function setPreviewTheme(day){state.previewDay=day;renderWorkspace();}
Object.assign(globalThis,{setPageLanguage,setPreviewLanguage,setPageTheme,setPreviewTheme});
const scopedWorkspace=renderWorkspace;
renderWorkspace=function(){scopedWorkspace();const workspace=document.getElementById('workspace');workspace.lang=state.previewLang;workspace.classList.toggle('preview-night',!state.previewDay);const controls=document.querySelector('.always-controls');controls.innerHTML=`<button data-language aria-label="${ui('Хэл солих',state.previewLang)}">${state.previewLang==='mn'?'MN / EN':'EN / MN'}</button><button data-appearance aria-label="${ui('Өдөр / Шөнийн горим',state.previewLang)}" aria-pressed="${state.previewDay}">${state.previewDay?'☀':'☾'}</button>`;translate();};
const scopedBody=body;
body=function(i){if(i!==7)return scopedBody(i);synchronize();const custom=state.deployment==='Тусгай'||state.integration!=='Шаардлагагүй';return `<dl class="review">${names.slice(0,7).map((n,j)=>`<dt>${ui(n)}</dt><dd data-user>${esc(summary(j))}</dd>`).join('')}<dt>${ui('Байршлууд')}</dt><dd data-user>${state.locations.map(esc).join(', ')}</dd><dt>${ui('Сонгосон цэс')}</dt><dd>${catalog.filter(x=>state.selected.has(x[0])).map(x=>ui(x[1])).join(', ')}</dd><dt>${ui('Багц ба үнэ')}</dt><dd>${ui('Цэс–багцын хамаарал, үнэ батлагдаагүй. Одоогоор төлбөр тооцохгүй.')}</dd><dt>${ui('Нэвтрүүлэлтийн чиглэл')}</dt><dd>${ui(custom?'Тусгай шаардлагыг iBeX багтай хянуулна.':'Стандарт орчны хувилбарыг хянана.')}</dd><dt>${ui('Админы и-мэйл')}</dt><dd data-user>${esc(state.email)}</dd></dl><p class="hint">${ui(state.sources.has('Шинээр эхлэх')?'Байршил, хөрөнгө, хэрэглэгчийн үндсэн мэдээллээ бэлтгэнэ.':'Эх бүртгэлээ хадгалж, талбарын зураглал хийж, жижиг түүврээр импорт туршина.')} ${ui('Жишээ өгөгдөл бодит орчинд шилжихгүй.')}</p><button class="primary" id="confirm">${ui(state.confirmed?'Загварын хураангуйг хянасан ✓':'Загварын хураангуйг хянасан')}</button><p class="hint">${ui('Энэ товч нь захиалга, төлбөр эсвэл байгууллага үүсгэхгүй. Хуудсыг шинэчлэхэд ноорог арилна.')}</p>`;};
workContent=function(){
 const p=text=>ui(text,state.previewLang);const user=value=>`<span data-user>${esc(value)}</span>`;const loc=state.locations[state.location]||'';
 const previewTable=(headers,rows)=>`<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${p(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 if(state.view==='assets'){
  const rows=[...state.assetTypes].map((a,i)=>[`AST-${String(i+1).padStart(3,'0')}`,p(a)]).filter(r=>r.join(' ').toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="tabs"><button data-asset-view="list" class="${state.assetView==='list'?'active':''}">${p('Жагсаалт')}</button><button data-asset-view="tree" class="${state.assetView==='tree'?'active':''}">${p('Мод')}</button></div><input class="workspace-search" id="assetSearch" aria-label="${p('Хөрөнгө хайх')}" placeholder="${p('Хөрөнгийн нэр, кодоор хайх')}" value="${esc(state.query)}">${!rows.length?`<p>${p('Илэрц алга')}</p>`:state.assetView==='list'?previewTable(['Хөрөнгийн код','Нэр','Байршил'],rows.map(r=>[r[0],r[1],user(loc)])):`<div class="tree">${rows.map(r=>`<details open><summary>${r[0]} · ${r[1]}</summary><p>↳ ${p('Жишээ бүрэлдэхүүн')}</p></details>`).join('')}</div>`}<p class="demo-note">${state.previewLang==='en'?'Sample assets. Total across all types':'Жишээ хөрөнгүүд. Бүх төрлийн нийлбэр хэрэгцээ'}: ${esc(state.assets)}</p>`;
 }
 if(state.view==='dashboard'){
  if(!state.dash.size)return `<div class="sample-card">${p('Dashboard сонгоогүй байна. Баруун талын 6-р алхмаар сонгоно.')}</div>`;
  const d=dashboards.find(x=>x[0]===state.dashboard)||dashboards.find(x=>state.dash.has(x[0]));
  const labels={cost:['Засварын зардал','Сэлбэгийн зардал','Ажиллах хүч','Бусад'],work:['Төлөвлөгөөт засвар','Төлөвлөгдөөгүй засвар','Хүсэлт','Дууссан ажил'],task:['Нийт даалгавар','Явцтай','Дууссан','Баг'],monitor:['Хөрөнгө','Хэмжилт','Хугацаа','Өгөгдөл']}[d[0]];
  return `<div class="tabs">${dashboards.filter(x=>state.dash.has(x[0])).map(x=>`<button data-dashboard="${x[0]}" class="${x[0]===d[0]?'active':''}">${p(x[1])}</button>`).join('')}</div><div class="stats">${labels.map((l,i)=>`<div class="stat"><small>${p(l)}</small><strong>${d[0]==='cost'?['330,000 ₮','80,000 ₮','230,000 ₮','20,000 ₮'][i]:[12,5,7,2][i]}</strong></div>`).join('')}</div><div class="chart"><h3>${p(d[1])} · ${user(loc)}</h3><svg viewBox="0 0 480 180" role="img" aria-label="${p('Жишээ график — бодит өгөгдөл биш')}"><path d="M20 20V150H460 M20 110H460 M20 70H460 M20 30H460" fill="none" stroke="#8390a6"/>${[45,70,110,60,95,120].map((v,i)=>`<rect x="${45+i*65}" y="${150-v}" width="28" height="${v}" rx="3" fill="#9464ef"/><text x="${45+i*65}" y="170" font-size="9" fill="#8390a6">${state.previewLang==='en'?'M'+(i+1):(i+1)+' сар'}</text>`).join('')}</svg></div><p class="demo-note">${p('Жишээ өгөгдөл — байгууллагын бодит үр дүн биш. Мониторинг нь техникийн үзүүлэлт; үйлдвэрлэл удирдах систем биш.')}</p>`;
 }
 if(state.view==='settings')return `<div class="sample-card"><h3 data-user>${esc(state.org)}</h3><p>${p('Хэрэглэгч')}: ${user(state.user)}</p><p>${p('Баг')}: ${user(state.team)}</p><p>${p('Админы и-мэйл')}: ${user(state.email)}</p><p>${p('Тохиргооны цэс бүх багцад байна. Бодит эрх олголт хийгдээгүй.')}</p></div>`;
 if(state.view==='create')return `<div class="sample-card"><h3>${p('Шинэ хүсэлт')}</h3><p>${p('Байршил → Хөрөнгө → Доголдлын тайлбар → Хавсралт')}</p><p>${p('Энэ нь хүсэлт үүсгэх урсгалын жишээ. Бодит хүсэлт илгээхгүй.')}</p></div>`;
 return previewTable(['Код','Нэр','Байршил','Төлөв'],[1,2].map(i=>[`DEMO-0${i}`,`${p(catalog.find(x=>x[0]===state.view)?.[1]||'Ажлууд')} · ${p('Жишээ')} ${i}`,user(loc),p('Жишээ')]))+`<p class="demo-note">${p('Энэ хүснэгт сонгосон цэсний харагдах загвар. Бодит бүртгэл биш.')}</p>`;
};
const scopedValid=valid;valid=function(){const result=scopedValid();translate();return result;};
// Error messages may be inserted by file validation after the normal render.
document.getElementById('steps').addEventListener('change',()=>translate());
document.getElementById('workspace').addEventListener('input',()=>translate());
renderSteps();renderWorkspace();translate();
