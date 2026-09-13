'use strict';

// Published navigation owns the editable header menus. Pricing and iBeX
// environment remain protected, fixed entries in the established header.
let publishedNavigation=null,navigationMoreItem=null,navigationMoreButton=null;

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
        {id:item.id,icon:item.icon,href:item.href||'',openInNewTab:item.openInNewTab===true,body:en?item.bodyEn:item.bodyMn,media:Array.isArray(item.media)?item.media.map(media=>({id:media.id,type:media.type,url:media.url||'',alt:en?media.altEn:media.altMn,caption:en?media.captionEn:media.captionMn,posterUrl:media.posterUrl||'',posterAlt:en?media.posterAltEn:media.posterAltMn})):[]}
      ])
    }))
  };
}

function bindDynamicMenuTrigger(button){
  button.addEventListener('click',event=>{event.stopPropagation();closeNavigationMore();closeLoginMenu();closeMobileNav();toggleHeaderMenu(button.dataset.menu,button)});
  button.addEventListener('mouseenter',()=>{if(innerWidth<=920)return;clearTimeout(menuHoverTimer);if(!menuPinned)menuHoverTimer=setTimeout(()=>openHeaderMenu(button.dataset.menu,button,false),260)});
}

function createManagedMenuItem(menu,overflow=false){
  const item=document.createElement('div');item.className=`navitem managed-navigation-item${overflow?' navigation-overflow-item':''}`;item.dataset.managedNavigation='1';
  const button=document.createElement('button');button.type='button';button.className='menu-trigger';button.dataset.menu=menu.id;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','megaMenu');item.append(button);bindDynamicMenuTrigger(button);return{item,button};
}

function closeNavigationMore(){if(!navigationMoreItem)return;navigationMoreItem.classList.remove('open');navigationMoreButton?.classList.remove('active');navigationMoreButton?.setAttribute('aria-expanded','false')}
const navigationBaseCloseHeaderMenu=closeHeaderMenu;
closeHeaderMenu=function(){closeNavigationMore();navigationBaseCloseHeaderMenu()};

function createMoreItem(menus){
  const item=document.createElement('div');item.className='navitem navigation-more';
  const button=document.createElement('button');button.type='button';button.className='navigation-more-trigger';button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls','navigationMoreMenu');
  const panel=document.createElement('div');panel.id='navigationMoreMenu';panel.className='navigation-more-panel';panel.setAttribute('role','menu');
  for(const menu of menus){const choice=document.createElement('button');choice.type='button';choice.dataset.moreMenu=menu.id;choice.setAttribute('role','menuitem');choice.addEventListener('click',event=>{event.stopPropagation();closeNavigationMore();closeLoginMenu();closeMobileNav();openHeaderMenu(menu.id,button,true);button.classList.add('active');button.setAttribute('aria-expanded','true')});panel.append(choice)}
  button.addEventListener('click',event=>{event.stopPropagation();const wasOpen=item.classList.contains('open');closeHeaderMenu();item.classList.toggle('open',!wasOpen);button.setAttribute('aria-expanded',String(!wasOpen))});
  item.addEventListener('mouseleave',()=>{if(innerWidth>920)closeNavigationMore()});item.append(button,panel);navigationMoreItem=item;navigationMoreButton=button;return item;
}

function rebuildHeaderMenus(config){
  const nav=document.getElementById('primaryNav'),organizationItem=nav.querySelector('.organization-link')?.closest('.navitem'),pricingButton=nav.querySelector('.menu-trigger[data-menu="pricing"]'),pricingItem=pricingButton?.closest('.navitem'),controls=nav.querySelector('.view-controls');
  if(!organizationItem||!pricingButton||!pricingItem||!controls)return;
  nav.querySelectorAll('[data-managed-navigation="1"],.navigation-more').forEach(node=>node.remove());navigationMoreItem=null;navigationMoreButton=null;
  const visible=(config.menus||[]).filter(menu=>menu.archived!==true&&menu.enabled!==false),primary=visible.slice(0,4),tail=visible.slice(4),directTail=tail.slice(0,1),overflow=tail.slice(1),primaryButtons=[],tailButtons=[];
  for(const menu of primary){const created=createManagedMenuItem(menu);nav.insertBefore(created.item,organizationItem);primaryButtons.push(created.button)}
  for(const menu of directTail){const created=createManagedMenuItem(menu);nav.insertBefore(created.item,controls);tailButtons.push(created.button)}
  for(const menu of overflow){const created=createManagedMenuItem(menu,true);nav.insertBefore(created.item,controls);tailButtons.push(created.button)}
  if(overflow.length)nav.insertBefore(createMoreItem(overflow),controls);
  menuTriggers.splice(0,menuTriggers.length,...primaryButtons,pricingButton,...tailButtons);
  ui.mn.nav=[...primary.map(menu=>menu.labelMn),'Үнэ',...tail.map(menu=>menu.labelMn)];ui.en.nav=[...primary.map(menu=>menu.labelEn),'Pricing',...tail.map(menu=>menu.labelEn)];
}

function applyPublishedNavigation(config){
  if(!config||!Array.isArray(config.menus))return;
  publishedNavigation=config;
  for(const menu of config.menus){headerMenus[menu.id]=localizedNavigationMenu(menu,false);headerMenusEN[menu.id]=localizedNavigationMenu(menu,true);menuExperience.mn[menu.id]={e:menu.feature.eyebrowMn,t:menu.feature.titleMn,p:menu.feature.descriptionMn,s:menu.feature.statMn,c:menu.feature.ctaMn};menuExperience.en[menu.id]={e:menu.feature.eyebrowEn,t:menu.feature.titleEn,p:menu.feature.descriptionEn,s:menu.feature.statEn,c:menu.feature.ctaEn}}
  rebuildHeaderMenus(config);
  if(activeHeaderMenu&&!config.menus.find(menu=>menu.id===activeHeaderMenu&&menu.enabled!==false&&menu.archived!==true))closeHeaderMenu();
  applyLanguage();
}

const navigationBaseIcon=ibexMenuIcon;
ibexMenuIcon=function(key,groupIndex,itemIndex,label){const item=(currentLang==='en'?headerMenusEN:headerMenus)[key]?.groups?.[groupIndex]?.items?.[itemIndex],name=item?.[2]?.icon,paths=name?ibexMenuIconPaths[name]:null;if(!paths)return navigationBaseIcon(key,groupIndex,itemIndex,label);return`<span class="menu-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`};

function configuredMediaBadges(meta){const media=Array.isArray(meta?.media)?meta.media:[],images=media.filter(row=>row.type==='image').length,videos=media.filter(row=>row.type==='video').length,pdfs=media.filter(row=>row.type==='pdf').length,en=currentLang==='en';if(!media.length)return'';return`<span class="navigation-media-badges">${images?`<i class="image">▧ ${images} ${en?'images':'зураг'}</i>`:''}${videos?`<i class="video">▶ ${videos} ${en?'videos':'видео'}</i>`:''}${pdfs?`<i class="pdf">▤ ${pdfs} PDF</i>`:''}</span>`}
function bindConfiguredContent(root,key){const menu=(currentLang==='en'?headerMenusEN:headerMenus)[key];root.querySelectorAll('[data-group][data-item]').forEach(button=>{const item=menu?.groups?.[Number(button.dataset.group)]?.items?.[Number(button.dataset.item)],meta=item?.[2]||{};button.dataset.href=meta.href||'';button.dataset.newTab=meta.openInNewTab?'1':'0';const copy=button.querySelector('.menu-item-copy')||button,existing=button.querySelector('.navigation-media-badges');if(existing)existing.remove();copy.insertAdjacentHTML('beforeend',configuredMediaBadges(meta))})}

const navigationHeaderRenderer=renderHeaderMenu;
renderHeaderMenu=function(key){navigationHeaderRenderer(key);if(key!=='pricing')bindConfiguredContent(megaGrid,key)};
const navigationDetailRenderer=renderDetailContent;
renderDetailContent=function(key,...args){navigationDetailRenderer(key,...args);if(key!=='pricing')bindConfiguredContent(document.getElementById('detailContent'),key)};
const navigationLanguageRenderer=applyLanguage;
applyLanguage=function(){if(publishedNavigation){const visible=publishedNavigation.menus.filter(menu=>menu.archived!==true&&menu.enabled!==false),primary=visible.slice(0,4),tail=visible.slice(4);ui.mn.nav=[...primary.map(menu=>menu.labelMn),'Үнэ',...tail.map(menu=>menu.labelMn)];ui.en.nav=[...primary.map(menu=>menu.labelEn),'Pricing',...tail.map(menu=>menu.labelEn)]}navigationLanguageRenderer();if(navigationMoreButton){navigationMoreButton.textContent=currentLang==='en'?'More':'Бусад';const chev=document.createElement('span');chev.className='chev';chev.textContent='⌄';navigationMoreButton.append(' ',chev);navigationMoreItem.querySelectorAll('[data-more-menu]').forEach(button=>{const menu=publishedNavigation?.menus.find(row=>row.id===button.dataset.moreMenu);button.textContent=currentLang==='en'?menu?.labelEn||'':menu?.labelMn||''})}};

document.addEventListener('click',event=>{if(!event.target.closest?.('.navigation-more'))closeNavigationMore();const target=event.target.closest?.('.mega-item[data-href],.detail-item[data-href]'),href=target?.dataset?.href;if(!href)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(target.dataset.newTab==='1')window.open(href,'_blank','noopener,noreferrer');else window.top.location.href=href},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigationMoreItem?.classList.contains('open')){closeNavigationMore();navigationMoreButton?.focus()}});
fetch('/api/content',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const payload=await response.json();applyPublishedNavigation(payload?.content?.navigation);if(activeHeaderMenu)renderHeaderMenu(activeHeaderMenu);if(currentDetailMenu)renderDetailContent(currentDetailMenu)}).catch(()=>{});

globalThis.applyPublishedNavigation=applyPublishedNavigation;
