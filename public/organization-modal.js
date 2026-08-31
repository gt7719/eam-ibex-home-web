'use strict';
const packageHeaderRenderer=renderHeaderMenu,packageDetailRenderer=renderDetailContent;
const priceUnavailable=()=>`<p>${currentLang==='en'?'Package settings have not loaded. Please retry.':'Багцын тохиргоо ачаалагдаагүй. Дахин оролдоно уу.'}</p><button type="button" class="retry-packages">${currentLang==='en'?'Retry':'Дахин ачаалах'}</button>`;
renderHeaderMenu=function(key){packageHeaderRenderer(key);if(key==='pricing'&&!pricingPlans.length)megaGrid.innerHTML=priceUnavailable();};
renderDetailContent=function(...args){packageDetailRenderer(...args);if(args[0]==='pricing'&&!pricingPlans.length)document.getElementById('detailContent').innerHTML=priceUnavailable();};
document.addEventListener('click',e=>{if(e.target.closest('.retry-packages'))loadSiteContent();});
const organizationDialog=document.createElement('dialog');
organizationDialog.className='organization-dialog';
organizationDialog.setAttribute('aria-labelledby','organizationDialogTitle');
organizationDialog.innerHTML='<header class="organization-dialog-head"><strong id="organizationDialogTitle"></strong><button type="button" class="organization-home"></button><button type="button" class="organization-close" aria-label="Хаах / Close">×</button></header><iframe title="iBeX орчин / iBeX environment"></iframe>';
document.body.append(organizationDialog);
const organizationFrame=organizationDialog.querySelector('iframe'),organizationTrigger=document.querySelector('.organization-link');
organizationTrigger.setAttribute('aria-haspopup','dialog');
function sendAppearance(frame){frame.contentWindow?.postMessage({type:'ibex-appearance',lang:currentLang,day:currentTheme==='day'},location.origin);}
function closeOrganization(){organizationDialog.close();document.body.classList.remove('organization-open');organizationTrigger.focus();}
organizationTrigger.addEventListener('click',e=>{e.preventDefault();closeHeaderMenu();closeMobileNav();closeLoginMenu();closeMenuDetail();if(!organizationFrame.hasAttribute('src'))organizationFrame.src='/organization-preview.html?embedded=1';organizationDialog.showModal();document.body.classList.add('organization-open');sendAppearance(organizationFrame);});
organizationDialog.querySelector('.organization-close').onclick=closeOrganization;
organizationDialog.querySelector('.organization-home').onclick=closeOrganization;
organizationDialog.addEventListener('cancel',e=>{e.preventDefault();closeOrganization();});
organizationDialog.addEventListener('click',e=>{if(e.target===organizationDialog)closeOrganization();});
organizationFrame.addEventListener('load',()=>sendAppearance(organizationFrame));
const packageAdminFrame=document.createElement('iframe');packageAdminFrame.className='package-admin-frame';packageAdminFrame.title='Багцын шаталсан тохиргоо';packageAdminFrame.hidden=true;document.querySelector('.admin-panel').append(packageAdminFrame);
const legacyRenderAdmin=renderAdmin;
renderPricingAdmin=function(){setAdminChrome('pricing');document.getElementById('adminTitle').textContent=currentLang==='en'?'Package configuration':'Багцын шаталсан тохиргоо';document.getElementById('adminSub').textContent='Free → Go → Plus → Pro → Custom';if(!packageAdminFrame.hasAttribute('src')&&canAdminSection('pricing'))packageAdminFrame.src='/package-admin.html';};
renderAdmin=function(){legacyRenderAdmin();const packages=adminSection==='pricing';packageAdminFrame.hidden=!packages;adminList.hidden=packages;document.querySelector('.admin-toolbar').hidden=packages;};
packageAdminFrame.addEventListener('load',()=>sendAppearance(packageAdminFrame));
function syncAppearance(){document.getElementById('organizationDialogTitle').textContent=currentLang==='en'?'iBeX environment':'iBeX орчин';organizationDialog.querySelector('.organization-home').textContent=currentLang==='en'?'← Home':'← Нүүр хуудас';sendAppearance(organizationFrame);sendAppearance(packageAdminFrame);}
new MutationObserver(syncAppearance).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new MutationObserver(syncAppearance).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  if(e.source===organizationFrame.contentWindow){
    if(e.data?.type==='ibex-close-organization'&&organizationDialog.open)closeOrganization();
    if(e.data?.type==='ibex-global-appearance'){
      if(['mn','en'].includes(e.data.lang)&&currentLang!==e.data.lang){currentLang=e.data.lang;applyLanguage();}
      if(typeof e.data.day==='boolean'&&currentTheme!==(e.data.day?'day':'night')){currentTheme=e.data.day?'day':'night';applyTheme();}
    }
  }
  if(e.source===packageAdminFrame.contentWindow&&e.data?.type==='ibex-close-admin')closeSiteAdmin();
  if(e.source===packageAdminFrame.contentWindow&&e.data?.type==='ibex-packages-published'){loadSiteContent();organizationFrame.contentWindow?.postMessage({type:'ibex-packages-refresh'},location.origin);}
});
syncAppearance();
