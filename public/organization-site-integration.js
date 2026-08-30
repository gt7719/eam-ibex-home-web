/* Shared appearance preferences only. Organization drafts remain in memory. */
'use strict';
words['Орчны загвар • Төлбөр авахгүй • Бодит байгууллага үүсгэхгүй']='Environment preview • No payments • No real organization created';
words['← Нүүр хуудас']='← Home';
reverseWords['Environment preview • No payments • No real organization created']='Орчны загвар • Төлбөр авахгүй • Бодит байгууллага үүсгэхгүй';
reverseWords['← Home']='← Нүүр хуудас';
const sitePageLanguage=setPageLanguage;
const sitePageTheme=setPageTheme;
function saveSitePreference(key,value){try{localStorage.setItem(key,value);}catch{/* Preferences are optional when storage is blocked. */}}
setPageLanguage=function(lang){sitePageLanguage(lang);saveSitePreference('ibex-lang',state.lang);};
setPageTheme=function(day){sitePageTheme(day);saveSitePreference('ibex-theme',day?'day':'night');};
let initialLanguage='mn',initialDay=false;
try{initialLanguage=localStorage.getItem('ibex-lang')==='en'?'en':'mn';initialDay=localStorage.getItem('ibex-theme')==='day';}catch{/* Use the default appearance. */}
sitePageLanguage(initialLanguage);
sitePageTheme(initialDay);
