'use strict';
// A read-only consumer of the same published configuration used by Pricing.
state.users=2;state.assets=5;
let publishedPackages=null,packageModel=null,packageFailure=false;
for(const [mn,en] of Object.entries({'Нийт хэрэглэгчийн тоо (Active + Inactive)':'Total users (Active + Inactive)','Хөрөнгийн нийт тоо (Parent + Child)':'Total assets (Parent + Child)','ХАБЭА':'HSE','Хөдөлмөрийн аюулгүй байдал, эрүүл ахуйн мэдээлэл.':'Health, safety and environment information.'})){words[mn]=en;reverseWords[en]=mn;}
catalog.push(['hse','ХАБЭА','Хөдөлмөрийн аюулгүй байдал, эрүүл ахуйн мэдээлэл.']);groups.push(['hse','ХАБЭА',['hse']]);
function packageSummary(){
  if(!publishedPackages||!packageModel)return {title:t('Багцын тохиргоо','Package configuration'),detail:packageFailure?t('Тохиргоог уншиж чадсангүй. Дахин нээж шалгана уу.','Could not load settings. Reopen to retry.'):t('Тохиргоог ачаалж байна…','Loading settings…')};
  const r=packageModel.recommend(publishedPackages,{menus:[...state.selected],dashboards:[...state.dash],users:Number(state.users),assets:Number(state.assets)}),p=publishedPackages.tiers[r.rank],base=publishedPackages.tiers[r.baseRank];
  if(r.invalid)return {title:t('Тоон мэдээллээ шалгана уу','Check your counts'),detail:t('Хэрэглэгч, хөрөнгийн тоо эерэг бүхэл тоо байна.','Users and assets must be positive whole numbers.')};
  const price=state.lang==='en'?p.priceEn:p.priceMn;
  const reasons=r.drivers.map(id=>packageModel.features.find(f=>f.id===id)).filter(Boolean).map(f=>state.lang==='en'?f.en:f.mn);
  const scope=t('Цэсний суурь багц: ','Menu base tier: ')+base.name;
  if(r.rank===4)return {title:'Custom',detail:t('Тусгай үнийн санал авах. ','Request a custom quote. ')+(reasons.length?reasons.join(', ')+'. ':'')+t('Сонгосон боломж эсвэл тоон хэрэгцээ стандарт багцаас давсан.','Selected features or counts exceed standard packages.')};
  if(r.needsReview)return {title:base.name+' · '+t('Нэмэлт багтаамж','Extra capacity'),detail:scope+'. '+t('Суурь сарын үнэ: ','Base monthly price: ')+(state.lang==='en'?base.priceEn:base.priceMn)+'. '+t('Хэрэглэгч эсвэл хөрөнгийн хязгаар давсан. Нэмэлт үнэ батлагдаагүй; нийт үнийн санал шаардлагатай.','User or asset capacity exceeded. Extra pricing is not approved; the total requires a quote.')};
  return {title:p.name+' · '+price+' / '+t('сар','month'),detail:scope+'. '+(r.rank>r.baseRank?t('Тоон хэрэгцээнээс шалтгаалан багц ахисан. ','Tier increased to fit your counts. '):'')+`${t('Нийт хэрэглэгч','Total users')}: ${state.users}/${p.users} · ${t('Нийт хөрөнгө','Total assets')}: ${state.assets}/${p.assets}`};
}
const packageFooter=updateFooter;
updateFooter=function(){packageFooter();const s=packageSummary();document.getElementById('recommendation').textContent=s.title;document.getElementById('priceNote').textContent=s.detail;};
const packageBody=body;
body=function(i){let html=packageBody(i).replaceAll('Идэвхтэй хэрэглэгчийн тоо','Нийт хэрэглэгчийн тоо (Active + Inactive)').replaceAll('Нийт хөрөнгийн тоо','Хөрөнгийн нийт тоо (Parent + Child)');if(i===7){const s=packageSummary();html=html.replace(ui('Цэс–багцын хамаарал, үнэ батлагдаагүй. Одоогоор төлбөр тооцохгүй.'),esc(s.title+' — '+s.detail));}return html;};
const packageStepSummary=summary;summary=function(i){return i===7?packageSummary().title:packageStepSummary(i);};
async function loadPublishedPackages(){
  try{packageModel=await import('/package-model.mjs');const response=await fetch('/api/packages',{cache:'no-store'});if(!response.ok)throw new Error('settings');const payload=await response.json();if(packageModel.validateConfig(payload.config).length)throw new Error('config');publishedPackages=payload.config;packageFailure=false;state.confirmed=false;}
  catch{publishedPackages=null;packageFailure=true;}
  renderSteps();renderWorkspace();
}
const embeddedOrganization=new URLSearchParams(location.search).get('embedded')==='1';
function tellParentAppearance(){if(embeddedOrganization)parent.postMessage({type:'ibex-global-appearance',lang:state.lang,day:document.body.classList.contains('day')},location.origin);}
const integratedLanguage=setPageLanguage,integratedTheme=setPageTheme;
setPageLanguage=function(lang){integratedLanguage(lang);tellParentAppearance();};setPageTheme=function(day){integratedTheme(day);tellParentAppearance();};
if(embeddedOrganization){
  const home=document.querySelector('.site-head a');home.addEventListener('click',e=>{e.preventDefault();parent.postMessage({type:'ibex-close-organization'},location.origin);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();parent.postMessage({type:'ibex-close-organization'},location.origin);}});
}
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent)return;
  if(e.data?.type==='ibex-appearance'){
    if(['mn','en'].includes(e.data.lang)&&e.data.lang!==state.lang)integratedLanguage(e.data.lang);
    if(typeof e.data.day==='boolean'&&document.body.classList.contains('day')!==e.data.day)integratedTheme(e.data.day);
    if(packageFailure)loadPublishedPackages();
  }
  if(e.data?.type==='ibex-packages-refresh')loadPublishedPackages();
});
renderSteps();renderWorkspace();loadPublishedPackages();
