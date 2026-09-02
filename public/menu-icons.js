'use strict';

// One outline icon language for every header-menu item.
const ibexMenuIconPaths={
  asset:'<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M12 12 4.2 7.6M12 12l7.8-4.4M12 12v9"/>',
  request:'<path d="M9 4h6M9 2v4m6-4v4"/><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 11h6m-3-3v6"/>',
  inspection:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 12 2.2 2.2L16 8.5M9 18h6"/>',
  work:'<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/>',
  mobile:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 5h4m-3 13h2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-9 4v4m-2-2h4"/>',
  condition:'<path d="M3 18h18M5 15l4-4 3 2 6-7"/><path d="M18 6h-4m4 0v4"/>',
  schedule:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m4 4-5 5-2-2"/>',
  parts:'<path d="M8 3v5H3m13-5v5h5M8 21v-5H3m13 5v-5h5"/><rect x="8" y="8" width="8" height="8" rx="2"/>',
  warehouse:'<path d="m3 9 9-5 9 5v12H3z"/><path d="M7 21v-7h10v7M3 9h18"/>',
  cost:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M16 9h5v6h-5a3 3 0 1 1 0-6ZM7 9h5"/>',
  contract:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6m-6 4h4"/>',
  safety:'<path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6z"/><path d="m9 12 2 2 4-5"/>',
  data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  report:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
  video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m10 9 4 3-4 3zM17 10l4-2v8l-4-2"/>',
  flow:'<path d="M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5"/><circle cx="6" cy="4" r="2"/><circle cx="18" cy="20" r="2"/><path d="m14 9 3 3-3 3"/>',
  guide:'<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
  content:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  generic:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8m-4-4h8"/>'
};

function ibexMenuIconName(key,groupIndex,itemIndex,label=''){
  const value=String(label).toLowerCase();
  if(key==='intro')return ['video','flow','guide','content'][groupIndex]||'generic';
  if(key==='product')return [['asset'],['request','inspection','work','mobile'],['calendar','condition','schedule'],['parts','warehouse','cost','contract'],['safety','data','report']][groupIndex]?.[itemIndex]||'generic';
  if(/хөрөнгө|asset/.test(value))return'asset';
  if(/хүсэлт|request/.test(value))return'request';
  if(/үзлэг|inspection/.test(value))return'inspection';
  if(/ажил|work|засвар/.test(value))return'work';
  if(/аюул|risk|hse|safety/.test(value))return'safety';
  if(/сэлбэг|нөөц|warehouse|part|inventory/.test(value))return'warehouse';
  if(/зардал|төсөв|cost|budget/.test(value))return'cost';
  if(/тайлан|kpi|report/.test(value))return'report';
  if(/өгөгдөл|data|ai/.test(value))return'data';
  return'generic';
}

function ibexMenuIcon(key,groupIndex,itemIndex,label){
  const name=ibexMenuIconName(key,groupIndex,itemIndex,label),paths=ibexMenuIconPaths[name]||ibexMenuIconPaths.generic;
  return `<span class="menu-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
}
globalThis.ibexMenuIcon=ibexMenuIcon;
