'use strict';

// The public header keeps the established renderer and visual system. This
// adapter changes only its published content source.
let publishedNavigation=null;

function localizedNavigationMenu(menu,en){
  return{
    k:en?menu.kickerEn:menu.kickerMn,
    t:en?menu.titleEn:menu.titleMn,
    i:en?menu.introEn:menu.introMn,
    foot:en?menu.footerEn:menu.footerMn,
    groups:(menu.groups||[]).filter(group=>group.enabled!==false).map(group=>({
      id:group.id,
      t:en?group.titleEn:group.titleMn,
      items:(group.items||[]).filter(item=>item.enabled!==false).map(item=>[
        en?item.titleEn:item.titleMn,
        en?item.descriptionEn:item.descriptionMn,
        {id:item.id,icon:item.icon,href:item.href||'',openInNewTab:item.openInNewTab===true,media:item.media?{type:item.media.type,url:item.media.url||'',alt:en?item.media.altEn:item.media.altMn,caption:en?item.media.captionEn:item.media.captionMn}:null}
      ])
    }))
  }
}

function applyPublishedNavigation(config){
  if(!config||!Array.isArray(config.menus))return;
  publishedNavigation=config;
  for(const menu of config.menus){
    if(!['product','solution','industry','ai','intro'].includes(menu.id))continue;
    headerMenus[menu.id]=localizedNavigationMenu(menu,false);
    headerMenusEN[menu.id]=localizedNavigationMenu(menu,true);
    menuExperience.mn[menu.id]={e:menu.feature.eyebrowMn,t:menu.feature.titleMn,p:menu.feature.descriptionMn,s:menu.feature.statMn,c:menu.feature.ctaMn};
    menuExperience.en[menu.id]={e:menu.feature.eyebrowEn,t:menu.feature.titleEn,p:menu.feature.descriptionEn,s:menu.feature.statEn,c:menu.feature.ctaEn};
    const trigger=menuTriggers.find(button=>button.dataset.menu===menu.id),index=menuTriggers.indexOf(trigger);
    if(trigger){trigger.hidden=menu.enabled===false;if(index>=0){ui.mn.nav[index]=menu.labelMn;ui.en.nav[index]=menu.labelEn;}}
  }
  if(activeHeaderMenu&&!config.menus.find(menu=>menu.id===activeHeaderMenu&&menu.enabled!==false))closeHeaderMenu();
  applyLanguage();
}

const navigationBaseIcon=ibexMenuIcon;
ibexMenuIcon=function(key,groupIndex,itemIndex,label){
  const item=(currentLang==='en'?headerMenusEN:headerMenus)[key]?.groups?.[groupIndex]?.items?.[itemIndex],name=item?.[2]?.icon,paths=name?ibexMenuIconPaths[name]:null;
  if(!paths)return navigationBaseIcon(key,groupIndex,itemIndex,label);
  return`<span class="menu-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
};

function bindConfiguredLinks(root,key){
  const menu=(currentLang==='en'?headerMenusEN:headerMenus)[key];
  root.querySelectorAll('[data-group][data-item]').forEach(button=>{
    const item=menu?.groups?.[Number(button.dataset.group)]?.items?.[Number(button.dataset.item)],meta=item?.[2]||{};
    button.dataset.href=meta.href||'';
    button.dataset.newTab=meta.openInNewTab?'1':'0';
  });
}

const navigationHeaderRenderer=renderHeaderMenu;
renderHeaderMenu=function(key){navigationHeaderRenderer(key);if(key!=='pricing')bindConfiguredLinks(megaGrid,key)};
const navigationDetailRenderer=renderDetailContent;
renderDetailContent=function(key,...args){navigationDetailRenderer(key,...args);if(key!=='pricing')bindConfiguredLinks(document.getElementById('detailContent'),key)};
const navigationLanguageRenderer=applyLanguage;
applyLanguage=function(){navigationLanguageRenderer();if(publishedNavigation){for(const menu of publishedNavigation.menus){const trigger=menuTriggers.find(button=>button.dataset.menu===menu.id);if(trigger)trigger.hidden=menu.enabled===false;}}};

document.addEventListener('click',event=>{
  const target=event.target.closest?.('.mega-item[data-href],.detail-item[data-href]'),href=target?.dataset?.href;
  if(!href)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(target.dataset.newTab==='1')window.open(href,'_blank','noopener,noreferrer');else window.top.location.href=href;
},true);

fetch('/api/content',{cache:'no-store'}).then(async response=>{
  if(!response.ok)return;
  const payload=await response.json();
  applyPublishedNavigation(payload?.content?.navigation);
  if(activeHeaderMenu)renderHeaderMenu(activeHeaderMenu);
  if(currentDetailMenu)renderDetailContent(currentDetailMenu);
}).catch(()=>{});

globalThis.applyPublishedNavigation=applyPublishedNavigation;
