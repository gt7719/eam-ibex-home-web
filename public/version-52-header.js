'use strict';

const environmentWrap=document.getElementById('environmentWrap');
const environmentTrigger=document.getElementById('environmentTrigger');
const environmentDropdown=document.getElementById('environmentDropdown');

function closeEnvironmentMenu({focus=false}={}){
  if(!environmentWrap||!environmentTrigger||!environmentDropdown)return;
  environmentDropdown.hidden=true;
  environmentWrap.classList.remove('open');
  environmentTrigger.setAttribute('aria-expanded','false');
  if(focus)environmentTrigger.focus();
}

function toggleEnvironmentMenu(){
  if(!environmentDropdown||!environmentWrap||!environmentTrigger)return;
  const opening=environmentDropdown.hidden;
  closeHeaderMenu();
  closeLoginMenu();
  environmentDropdown.hidden=!opening;
  environmentWrap.classList.toggle('open',opening);
  environmentTrigger.setAttribute('aria-expanded',String(opening));
}

environmentTrigger?.addEventListener('click',event=>{
  event.stopPropagation();
  toggleEnvironmentMenu();
});

document.addEventListener('click',event=>{
  if(!event.target.closest?.('#environmentWrap'))closeEnvironmentMenu();
  if(event.target.closest?.('.menu-trigger,#loginLink,#headerRegisterLink'))closeEnvironmentMenu();
},true);

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&environmentDropdown&&!environmentDropdown.hidden){
    closeEnvironmentMenu({focus:true});
  }
});

globalThis.closeEnvironmentMenu=closeEnvironmentMenu;
