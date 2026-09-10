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
  downtime:'<path d="M4 5v14h16"/><path d="m6 9 4 4 3-3 5 5"/><path d="m18 11v4h-4"/>',
  calendarCheck:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-12 6 2 2 4-5"/>',
  fieldWork:'<path d="M4 20h16M7 20v-8l5-5 5 5v8"/><path d="m9 11 3 3 3-3"/>',
  stock:'<path d="m4 8 8-4 8 4-8 4z"/><path d="m4 12 8 4 8-4m-16 4 8 4 8-4"/>',
  budget:'<path d="M4 19V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M8 15h2m4-4h2m-8 0h2m4 4h2"/>',
  signed:'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 16c2-3 3 2 5-1 1-1 2 0 3 0"/>',
  analytics:'<path d="M4 20V9m5 11V5m5 15v-7m5 7V3"/><path d="M2 20h20"/>',
  heavyEquipment:'<circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M3 16h17l-2-6h-7L9 6H5v7H3z"/>',
  processing:'<path d="M4 21V9l5 3V7l5 3V4h6v17z"/><path d="M8 17h2m4 0h2"/>',
  production:'<path d="M3 17h18M5 17l2-6h10l2 6"/><circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/>',
  equipmentCheck:'<path d="M4 6h9v12H4z"/><path d="m7 12 2 2 4-5m4-5v16m-2-3h4"/>',
  power:'<path d="m13 2-8 12h6l-1 8 9-13h-6z"/>',
  network:'<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="m7 11 10-5M7 13l10 5"/>',
  fleet:'<path d="M3 16V8h13l4 4v4"/><path d="M16 8v4h4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  facility:'<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M8 10h2m4 0h2"/>',
  integration:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 9m5-9-3 9M8 6h8"/>',
  rules:'<path d="M5 5h14M5 12h14M5 19h14"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="19" r="2"/>',
  pilot:'<path d="m12 3 5 6-5 12-5-12z"/><path d="M7 9h10M9 15h6"/>',
  mapping:'<path d="M4 6h6v5H4zM14 13h6v5h-6z"/><path d="M10 8h4a3 3 0 0 1 3 3v2"/>',
  pattern:'<path d="M3 17c3-8 5 0 8-7s5 6 10-3"/><path d="M3 21h18M3 3v18"/>',
  method:'<path d="M9 3h6v4l4 10a3 3 0 0 1-3 4H8a3 3 0 0 1-3-4L9 7z"/><path d="M8 14h8"/>',
  predictive:'<path d="M4 19V5m0 14h16"/><path d="m7 15 3-4 3 2 5-7"/><circle cx="18" cy="6" r="2"/>',
  generative:'<path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM18 15l.7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7z"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
  sparkles:'<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z"/>',
  route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h4a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H9a3 3 0 0 0-3 3v1h11"/>',
  rocket:'<path d="M14 4c3-1 5-1 6 0 1 1 1 3 0 6l-6 6-6-6z"/><path d="m8 10-3 1-2 4 6-1m5 1-1 4-4 2 1-6"/><circle cx="15" cy="8" r="1.5"/>',
  dataImport:'<ellipse cx="9" cy="5" rx="6" ry="2.5"/><path d="M3 5v8c0 1.4 2.7 2.5 6 2.5M3 9c0 1.4 2.7 2.5 6 2.5"/><path d="M15 12v8m-3-3 3 3 3-3"/>',
  social:'<path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8m-8 4h5"/>',
  event:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
  research:'<path d="M9 3h6v4l4 10a3 3 0 0 1-3 4H8a3 3 0 0 1-3-4L9 7z"/><path d="M8 14h8m-6-7h4"/>'
};

const ibexMenuIconAssignments={
  product:[['asset'],['request','inspection','work','mobile'],['calendar','condition','schedule'],['parts','warehouse','cost','contract'],['safety','data','report']],
  solution:[['downtime','calendarCheck'],['fieldWork','safety'],['stock','budget'],['signed','analytics']],
  industry:[['heavyEquipment','processing'],['production','equipmentCheck'],['power','network'],['fleet','facility']],
  ai:[['integration','rules'],['pilot','mapping'],['pattern','method'],['predictive','generative']],
  intro:[['play','mobile','sparkles'],['flow','route'],['rocket','dataImport'],['social','event','research']]
};

function ibexMenuIconName(key,groupIndex,itemIndex){
  return ibexMenuIconAssignments[key]?.[groupIndex]?.[itemIndex]||null;
}

function ibexMenuIcon(key,groupIndex,itemIndex){
  return ibexOutlineIcon(ibexMenuIconName(key,groupIndex,itemIndex));
}
function ibexOutlineIcon(name){
  const paths=name?ibexMenuIconPaths[name]:null;
  if(!paths)return'';
  return `<span class="menu-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
}
globalThis.ibexMenuIcon=ibexMenuIcon;
