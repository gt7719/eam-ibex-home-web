'use strict';
function socialRows(type){
  const rows=typeof socialPosts!=='undefined'&&Array.isArray(socialPosts)?socialPosts:[];
  return rows.filter(row=>row?.type===type).sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
}
function localizedRow(row,field,en){return row?.[`${field}${en?'En':'Mn'}`]||row?.[field]||'';}
function eventDate(value,en){
  if(!value)return'';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
  return new Intl.DateTimeFormat(en?'en-US':'mn-MN',{dateStyle:'medium',timeStyle:value.includes('T')?'short':undefined}).format(date);
}
function eventCards(en){
  const events=socialRows('event');
  if(!events.length)return `<p>${en?'Published public events will appear here after administrator review.':'Админ хянаж нийтэлсэн олон нийтийн арга хэмжээ энд харагдана.'}</p>`;
  return `<div class="event-resource-list">${events.map(row=>{
    const title=localizedRow(row,'title',en),summary=localizedRow(row,'summary',en),description=localizedRow(row,'description',en),type=localizedRow(row,'eventType',en),location=localizedRow(row,'location',en),organizer=localizedRow(row,'organizer',en),start=eventDate(row.startAt,en),end=eventDate(row.endAt,en),link=row.videoUrl||row.sourceUrl;
    return `<article class="event-resource-card">${row.imageUrl?`<img class="event-cover" src="${esc(row.imageUrl)}" alt="${esc(title)}" loading="lazy">`:''}<div class="event-resource-copy">${type?`<small>${esc(type)}</small>`:''}<h3>${esc(title)}</h3>${summary?`<p class="event-summary">${esc(summary)}</p>`:''}<dl>${start?`<div><dt>${en?'Date':'Огноо'}</dt><dd>${esc(end?`${start} — ${end}`:start)}</dd></div>`:''}${location?`<div><dt>${en?'Location':'Байршил'}</dt><dd>${esc(location)}</dd></div>`:''}${organizer?`<div><dt>${en?'Organizer':'Зохион байгуулагч'}</dt><dd>${esc(organizer)}</dd></div>`:''}</dl>${description?`<p>${esc(description)}</p>`:''}${Array.isArray(row.galleryUrls)&&row.galleryUrls.length?`<div class="event-gallery">${row.galleryUrls.map((url,index)=>`<img src="${esc(url)}" alt="${esc(`${title} ${index+1}`)}" loading="lazy">`).join('')}</div>`:''}${link?`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${en?'View source ↗':'Эх сурвалжийг харах ↗'}</a>`:''}</div></article>`;
  }).join('')}</div>`;
}
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
    const posts=[...socialRows('post'),...socialRows('reel')].sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
    html+=`<section class="continuous-evidence"><h3>${en?'iBeX Project Mongolia content':'iBeX Project Mongolia контент'}</h3>${posts.length?`<div class="resource-cards">${posts.map(post=>`<article class="resource-card">${post.imageUrl?`<img src="${esc(post.imageUrl)}" alt="" loading="lazy" style="width:100%;height:auto;border-radius:10px;margin-bottom:12px">`:''}<small>${esc(String(post.type||'post').toUpperCase())}</small><h3>${esc(post.title||post.sourceUrl)}</h3><p>${esc(post.text||'')}</p><a href="${esc(post.sourceUrl)}" target="_blank" rel="noopener noreferrer">${en?'View original ↗':'Эх контентыг харах ↗'}</a></article>`).join('')}</div>`:`<p>${en?'Published Facebook posts and Reels will appear here after administrator review.':'Админ хянаж нийтэлсэн Facebook пост болон Reel энд харагдана.'}</p>`}</section>`;
  }
  if(key==='intro'&&groupIndex===3&&itemIndex===1)html+=`<section class="continuous-evidence public-events"><h3>${en?'Published public events':'Нийтэлсэн олон нийтийн арга хэмжээ'}</h3>${eventCards(en)}</section>`;
  if(key==='intro'&&groupIndex===3&&itemIndex===2){
    const research=socialRows('research');
    html+=`<section class="continuous-evidence"><h3>${en?'Research and development':'Судалгаа ба хөгжүүлэлт'}</h3>${research.length?`<div class="resource-cards">${research.map(row=>`<article class="resource-card">${row.imageUrl?`<img src="${esc(row.imageUrl)}" alt="" loading="lazy">`:''}<h3>${esc(row.title||localizedRow(row,'title',en))}</h3><p>${esc(row.text||localizedRow(row,'description',en))}</p>${row.sourceUrl?`<a href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">${en?'View source ↗':'Эх сурвалжийг харах ↗'}</a>`:''}</article>`).join('')}</div>`:`<p>${en?'Published research and development content will appear here.':'Нийтэлсэн судалгаа ба хөгжүүлэлтийн мэдээлэл энд харагдана.'}</p>`}</section>`;
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

const articleLightbox=document.createElement('dialog');
articleLightbox.className='article-lightbox';
articleLightbox.innerHTML='<button type="button" class="article-lightbox-close" aria-label="Хаах">×</button><img alt=""><p></p>';
document.body.appendChild(articleLightbox);
document.getElementById('detailContent').addEventListener('click',event=>{
 const trigger=event.target.closest('[data-article-image]');if(!trigger)return;
 const image=articleLightbox.querySelector('img'),caption=articleLightbox.querySelector('p');
 image.src=trigger.dataset.articleImage;image.alt=trigger.dataset.articleCaption||'';caption.textContent=trigger.dataset.articleCaption||'';
 articleLightbox.querySelector('.article-lightbox-close').setAttribute('aria-label',currentLang==='en'?'Close':'Хаах');
 articleLightbox.showModal();articleLightbox.querySelector('.article-lightbox-close').focus();
});
articleLightbox.querySelector('.article-lightbox-close').addEventListener('click',()=>articleLightbox.close());
articleLightbox.addEventListener('click',event=>{if(event.target===articleLightbox)articleLightbox.close();});
