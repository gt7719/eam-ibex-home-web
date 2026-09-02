'use strict';

window.__ibexV31AdminHub=true;

const v31ExternalSections=new Set(['pricing','knowledge','social']);
const v31SectionUrls={pricing:'/admin/pricing?embedded=1',knowledge:'/admin/assistant?embedded=1',social:'/admin/social?embedded=1'};
const v31SectionCopy={
  mn:{
    pricing:{tab:'ҮНЭ БА БАГЦ',title:'Үнэ ба төлбөр',sub:'Багцын шатлал, MNT үнэ, жилийн хөнгөлөлт болон банкны төлбөрийн холбоосыг удирдана.'},
    knowledge:{tab:'AI МЭДЛЭГИЙН САН',title:'AI мэдлэгийн сан',sub:'Сайтын AI туслахын баталгаажсан эх сурвалж, төлөв болон хувилбарыг удирдана.'},
    social:{tab:'МЭДЭЭ БА КОНТЕНТ',title:'Мэдээ ба контент',sub:'Facebook пост, Reel, зураг болон нийтлэх төлөвийг эрхийн хүрээнд удирдана.'}
  },
  en:{
    pricing:{tab:'PRICING',title:'Pricing and payments',sub:'Manage package tiers, MNT prices, annual discounts and secure bank checkout links.'},
    knowledge:{tab:'AI KNOWLEDGE',title:'AI knowledge base',sub:'Manage approved sources, governance status and versions for the website assistant.'},
    social:{tab:'NEWS & CONTENT',title:'News and content',sub:'Manage Facebook posts, Reels, images and publishing status within assigned access.'}
  }
};

Object.assign(adminPermissionBySection,{knowledge:'knowledge.manage',social:'social.manage'});
contentAdminText.mn.tabs.knowledge=v31SectionCopy.mn.knowledge.tab;
contentAdminText.mn.tabs.social=v31SectionCopy.mn.social.tab;
contentAdminText.en.tabs.knowledge=v31SectionCopy.en.knowledge.tab;
contentAdminText.en.tabs.social=v31SectionCopy.en.social.tab;

for(const section of ['knowledge','social']){
  if(adminTabs.querySelector(`[data-admin-tab="${section}"]`))continue;
  const button=document.createElement('button');
  button.className='admin-tab';button.type='button';button.dataset.adminTab=section;
  button.textContent=v31SectionCopy.mn[section].tab;adminTabs.appendChild(button);
}
for(const section of ['partners','people','pricing','knowledge','social']){
  const button=adminTabs.querySelector(`[data-admin-tab="${section}"]`);
  if(button)adminTabs.appendChild(button);
}

const v31Toolbar=document.querySelector('.admin-toolbar');
const v31BaseRenderAdmin=renderAdmin;
const v31BaseCollectCurrentAdmin=collectCurrentAdmin;

function v31RenderExternalAdmin(section){
  const en=currentLang==='en',copy=v31SectionCopy[en?'en':'mn'][section];
  document.getElementById('adminTitle').textContent=copy.title;
  document.getElementById('adminSub').textContent=copy.sub;
  document.getElementById('adminClose').setAttribute('aria-label',en?'Close':'Хаах');
  v31Toolbar.hidden=true;adminList.classList.add('admin-list-embedded');
  [...adminTabs.querySelectorAll('.admin-tab')].forEach(button=>{
    const key=button.dataset.adminTab,allowed=canAdminSection(key);
    button.hidden=!allowed;
    button.textContent=v31ExternalSections.has(key)?v31SectionCopy[en?'en':'mn'][key].tab:contentAdminText[en?'en':'mn'].tabs[key];
    button.classList.toggle('active',key===section);
  });
  adminList.innerHTML=`<iframe class="admin-embedded-frame" src="${v31SectionUrls[section]}" title="${esc(copy.title)}"></iframe>`;
}

renderAdmin=function(){
  if(v31ExternalSections.has(adminSection)){v31RenderExternalAdmin(adminSection);return;}
  v31Toolbar.hidden=false;adminList.classList.remove('admin-list-embedded');v31BaseRenderAdmin();
};

collectCurrentAdmin=function(){
  if(!v31ExternalSections.has(adminSection))v31BaseCollectCurrentAdmin();
};

openSiteAdmin=function(preferredSection){
  if(!adminPreview){window.parent.location.href='/admin/login';return;}
  const allowedSections=['partners','people','pricing','knowledge','social'].filter(canAdminSection);
  if(!allowedSections.length){window.parent.location.href='/admin';return;}
  adminSection=allowedSections.includes(preferredSection)?preferredSection:allowedSections[0];
  adminDraft=clonePlans(pricingPlans);
  partnerDraft=JSON.parse(JSON.stringify(partnerOrganizations));
  peopleDraft=JSON.parse(JSON.stringify(projectPeople));
  renderAdmin();pricingAdmin.hidden=false;document.getElementById('adminTitle').focus?.();
};

const v31HubParams=new URLSearchParams(location.search);
if(v31HubParams.get('embeddedHub')==='1'){
  document.body.classList.add('embedded-admin-hub');
  const embeddedClose=document.getElementById('adminClose');
  embeddedClose.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();window.parent.location.href='/';
  },true);
}
if(v31HubParams.get('admin')==='content'){
  fetch('/api/admin/session',{cache:'no-store'}).then(async response=>{
    if(!response.ok){window.parent.location.replace('/admin/login');return;}
    const payload=await response.json();
    adminPermissions=new Set(payload.user?.permissions||[]);
    adminPreview=['partners','people','pricing','knowledge','social'].some(canAdminSection);
    if(adminPreview)openSiteAdmin(v31HubParams.get('section'));else window.parent.location.replace('/admin');
  }).catch(()=>window.parent.location.replace('/admin/login'));
}
