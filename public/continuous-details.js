'use strict';
function continuousArticleMarkup(key,groupIndex,itemIndex,en){
  const article=detailArticles[`${key}-${groupIndex}-${itemIndex}`];
  if(!article)return `<article class="continuous-article"><p>${en?'This content has not been added yet.':'Энэ мэдээлэл хараахан нэмэгдээгүй байна.'}</p></article>`;
  let html=`<article class="continuous-article">${article[en?'en':'mn'].map(p=>`<p>${esc(p)}</p>`).join('')}`;
  // Retain the previously supplied work-flow evidence, now in reading order.
  if(key==='intro'&&groupIndex===1&&itemIndex===1){
    html+=`<section class="continuous-evidence"><h3>${en?'Work-flow screens':'Ажлын урсгалын дэлгэцүүд'}</h3>`;
    for(let i=0;i<4;i++){const step=flowStepData(i,en);html+=`<section><h4>${esc(step.t)}</h4><p>${esc(step.p)}</p><div class="flow-step-media">${step.media.map(([file,caption])=>`<figure><img src="/ibex-screens/${esc(file)}" alt="${esc(caption)}" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`).join('')}</div></section>`;}
    html+='</section>';
  }
  return html+detailSupplementMarkup(key,groupIndex,itemIndex,en)+'</article>';
}
function renderContinuousDetail(key,groupIndex,itemIndex,scroll=true){
  const en=currentLang==='en',menu=(en?headerMenusEN:headerMenus)[key],item=menu?.groups?.[groupIndex]?.items?.[itemIndex];
  const inline=document.getElementById('resourceInline');if(!inline||!item)return;
  currentDetailView='index';currentDetailFocus=groupIndex;currentResourceSelection={groupIndex,itemIndex};currentFlowStep=null;
  syncDetailNavigation();
  document.getElementById('detailTitle').textContent=menu.t;
  document.getElementById('detailIntro').textContent=menu.i;
  document.getElementById('detailContent').classList.add('reading-detail');
  document.querySelectorAll('#detailContent .detail-item').forEach(button=>button.classList.toggle('active',Number(button.dataset.group)===groupIndex&&Number(button.dataset.item)===itemIndex));
  inline.innerHTML=`<h3 class="inline-topic-title">${esc(item[0])}</h3>`+continuousArticleMarkup(key,groupIndex,itemIndex,en);inline.classList.add('open');
  if(scroll){const pane=document.getElementById('detailScroll'),head=document.querySelector('.detail-head');const top=pane.scrollTop+inline.getBoundingClientRect().top-pane.getBoundingClientRect().top-head.getBoundingClientRect().height-16;pane.scrollTo({top:Math.max(0,top),behavior:reduceMotion?'auto':'smooth'});}
}
const continuousBaseRenderer=renderDetailContent;
renderDetailContent=function(key,...args){
  document.getElementById('detailContent').classList.remove('reading-detail');
  continuousBaseRenderer(key,...args);
  if(key==='pricing'){
    const en=currentLang==='en';
    const paragraphs=en?[
      'Packages combine included menus, total users and total assets. Total users means Active plus Inactive. Every Parent and Child asset counts individually.',
      'Free, Go, Plus and Pro have cumulative menu scope; Custom covers individually agreed needs. Published administrator settings determine the displayed scope, limits and monthly price, rather than a separate fixed description.',
      'When capacity exceeds the menu-based tier, the published policy either recommends a sufficient tier or requires a quote for additional capacity. Needs beyond Pro limits require Custom. Unapproved extra-capacity charges are not invented.'
    ]:[
      'Багцын хүрээ нь сонгосон цэс, нийт хэрэглэгч болон нийт хөрөнгийн тооноос бүрдэнэ. Нийт хэрэглэгчид Active ба Inactive хамт тооцогдоно. Parent болон Child хөрөнгө тус бүрийг нэгжээр тоолно.',
      'Free, Go, Plus, Pro багцын цэс шатлан өвлөгдөнө. Custom нь тусгай тохиролцооны хэрэгцээнд хамаарна. Харагдах цэс, тоон хязгаар болон сарын үнийг админаас нийтэлсэн тохиргооноос авна; тусдаа тогтмол тайлбараар давхар тогтоохгүй.',
      'Цэсээр тогтоосон суурь багцын багтаамж хэтэрвэл нийтэлсэн бодлогын дагуу багц ахиулах эсвэл нэмэлт багтаамжийн үнийн санал шаардана. Pro-ийн хязгаараас давсан хэрэгцээ Custom болно. Батлагдаагүй нэмэлт үнийг зохиож тооцохгүй.'
    ];
    document.getElementById('detailContent').insertAdjacentHTML('beforeend',`<article class="continuous-article pricing-guide"><h3>${en?'How package scope is determined':'Багцын хүрээ хэрхэн тодорхойлогдох вэ?'}</h3>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</article>`);
  }
};
const continuousBack=closeResourceDetail;
closeResourceDetail=function(){continuousBack();document.getElementById('detailContent').classList.remove('reading-detail');const d=(currentLang==='en'?headerMenusEN:headerMenus)[currentDetailMenu];if(d){document.getElementById('detailTitle').textContent=d.t;document.getElementById('detailIntro').textContent=d.i;}};
const continuousLanguage=applyLanguage;
applyLanguage=function(){const key=currentDetailMenu,selection=currentResourceSelection;continuousLanguage();if(key&&selection&&!menuDetail.hidden)renderContinuousDetail(key,selection.groupIndex,selection.itemIndex,false);};
