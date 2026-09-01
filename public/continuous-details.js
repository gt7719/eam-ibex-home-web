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
  if(key==='intro'&&groupIndex===3&&itemIndex===0){
    const posts=typeof socialPosts!=='undefined'&&Array.isArray(socialPosts)?socialPosts:[];
    html+=`<section class="continuous-evidence"><h3>${en?'iBeX Project Mongolia content':'iBeX Project Mongolia контент'}</h3>${posts.length?`<div class="resource-cards">${posts.map(post=>`<article class="resource-card">${post.imageUrl?`<img src="${esc(post.imageUrl)}" alt="" loading="lazy" style="width:100%;height:auto;border-radius:10px;margin-bottom:12px">`:''}<small>${esc(String(post.type||'post').toUpperCase())}</small><h3>${esc(post.title||post.sourceUrl)}</h3><p>${esc(post.text||'')}</p><a href="${esc(post.sourceUrl)}" target="_blank" rel="noopener noreferrer">${en?'View original ↗':'Эх контентыг харах ↗'}</a></article>`).join('')}</div>`:`<p>${en?'Published Facebook posts and Reels will appear here after administrator review.':'Админ хянаж нийтэлсэн Facebook пост болон Reel энд харагдана.'}</p>`}</section>`;
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
      'Choose monthly or annual billing, compare the included scope, then select the plan that fits your organization.',
      'Total users include Active and Inactive accounts. Every Parent and Child asset is counted.'
    ]:[
      'Сар эсвэл жилийн төлөлтөө сонгож, багцын хамрах хүрээг харьцуулсны дараа байгууллагадаа тохирох багцыг сонгоно.',
      'Нийт хэрэглэгчид Active болон Inactive бүртгэл хамт орно. Parent болон Child хөрөнгө тус бүр тоологдоно.'
    ];
    document.getElementById('detailContent').insertAdjacentHTML('beforeend',`<article class="continuous-article pricing-guide"><h3>${en?'Choose your plan':'Багцаа сонгох'}</h3>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</article>`);
  }
};
const continuousBack=closeResourceDetail;
closeResourceDetail=function(){continuousBack();document.getElementById('detailContent').classList.remove('reading-detail');const d=(currentLang==='en'?headerMenusEN:headerMenus)[currentDetailMenu];if(d){document.getElementById('detailTitle').textContent=d.t;document.getElementById('detailIntro').textContent=d.i;}};
const continuousLanguage=applyLanguage;
applyLanguage=function(){const key=currentDetailMenu,selection=currentResourceSelection;continuousLanguage();if(key&&selection&&!menuDetail.hidden)renderContinuousDetail(key,selection.groupIndex,selection.itemIndex,false);};
