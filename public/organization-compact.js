'use strict';
// Keep all setup state and scoped workspace controls; remove duplicated chrome.
const compactHome=document.querySelector('.site-head a');
compactHome.classList.add('compact-home');
document.querySelector('.intro').append(compactHome);
document.querySelectorAll('.intro>p:not(.eyebrow),.intro>small,.preview-heading>strong').forEach(el=>el.remove());
document.body.classList.add('compact-organization');
if(embeddedOrganization)document.body.classList.add('embedded-organization');
function measureOrganizationChrome(){
  document.documentElement.style.setProperty('--org-footer-height',`${Math.ceil(document.querySelector('footer').getBoundingClientRect().height)}px`);
  document.documentElement.style.setProperty('--org-actions-height',`${Math.ceil(document.querySelector('.step-actions').getBoundingClientRect().height)}px`);
}
const organizationChromeObserver=new ResizeObserver(measureOrganizationChrome);
organizationChromeObserver.observe(document.querySelector('footer'));
organizationChromeObserver.observe(document.querySelector('.step-actions'));
measureOrganizationChrome();
