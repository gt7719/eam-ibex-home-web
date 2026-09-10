'use strict';

// References retain the approved article IDs, media and explicit topic icons.
const ibexNavigation = {
  product: {
    mn: 'Бүтээгдэхүүн', en: 'Product', groups: [
      { id: 'assets', mn: 'Хөрөнгийн бүртгэл', en: 'Asset register', icon: 'asset', sources: [['product', 0, [0]]] },
      { id: 'work', mn: 'Ажил ба Mobile', en: 'Work and mobile', icon: 'work', sources: [['product', 1, [0, 1, 2, 3]]] },
      { id: 'maintenance', mn: 'PM/PdM ба төлөвлөлт', en: 'Maintenance planning', icon: 'calendar', sources: [['product', 2, [0, 1, 2]]] },
      { id: 'resources', mn: 'Нөөц, зардал ба төсөл', en: 'Resources, costs and projects', icon: 'warehouse', sources: [['product', 3, [0, 1, 2, 3]]] },
      { id: 'safety', mn: 'ХАБЭА ба тайлан', en: 'Safety and reporting', icon: 'safety', sources: [['product', 4, [0, 2]]] },
      { id: 'data', mn: 'Datahub ба AI', en: 'Datahub and AI', icon: 'integration', sources: [['product', 4, [1]], ['ai', 0, [0, 1]], ['ai', 1, [0, 1]], ['ai', 2, [0, 1]], ['ai', 3, [0, 1]]] }
    ]
  },
  solution: {
    mn: 'Шийдэл', en: 'Solutions', groups: [
      { id: 'reliability', mn: 'Найдвартай ажиллагаа', en: 'Reliability', icon: 'downtime', sources: [['solution', 0, [0, 1]]] },
      { id: 'field', mn: 'Гүйцэтгэл ба аюулгүй байдал', en: 'Execution and safety', icon: 'safety', sources: [['solution', 1, [0, 1]]] },
      { id: 'cost', mn: 'Нөөц ба зардал', en: 'Resources and costs', icon: 'budget', sources: [['solution', 2, [0, 1]]] },
      { id: 'management', mn: 'Удирдлага ба хэрэгжилт', en: 'Management and delivery', icon: 'analytics', sources: [['solution', 3, [0, 1]]] },
      { id: 'industries', mn: 'Хэрэглээний салбар', en: 'Industries', icon: 'processing', sources: [['industry', 0, [0, 1]], ['industry', 1, [0, 1]], ['industry', 2, [0, 1]], ['industry', 3, [0, 1]]] }
    ]
  },
  intro: {
    mn: 'Танилцуулга', en: 'Resources', groups: [
      { id: 'video', mn: 'Видео', en: 'Videos', icon: 'play', sources: [['intro', 0, [0, 1, 2]]] },
      { id: 'flowcharts', mn: 'Flowchart', en: 'Flowcharts', icon: 'flow', sources: [['intro', 1, [0, 1]]] },
      { id: 'guides', mn: 'Гарын авлага', en: 'User guides', icon: 'guide', sources: [['intro', 2, [0, 1]]] },
      { id: 'news', mn: 'Мэдээ ба контент', en: 'News and content', icon: 'content', sources: [['intro', 3, [0, 1, 2]]] }
    ]
  }
};

let navigationState = null;
function navigationRoot(key) { return key === 'ai' ? 'product' : key === 'industry' ? 'solution' : key; }
function navigationGroupFor(key, groupIndex, itemIndex) {
  return ibexNavigation[navigationRoot(key)]?.groups.find(group => group.sources.some(([source, index, items]) => source === key && index === groupIndex && items.includes(itemIndex)));
}
function navigationGroupButtons(root) {
  return ibexNavigation[root].groups.map(group => `<button type="button" class="nav-choice" data-nav-root="${root}" data-nav-group="${group.id}">${ibexOutlineIcon(group.icon)}<span>${esc(group[currentLang])}</span><span class="nav-choice-arrow" aria-hidden="true">›</span></button>`).join('');
}
function renderNavigationHeader(key) {
  const root = navigationRoot(key), menu = ibexNavigation[root];
  if (!menu) return;
  megaMenu.classList.add('grouped-navigation');
  document.getElementById('megaTitle').textContent = menu[currentLang];
  megaGrid.className = 'mega-grid navigation-groups';
  megaGrid.innerHTML = navigationGroupButtons(root);
  megaAdmin.hidden = true;
}
function navigationFrame(root, title, description = '', section = '') {
  currentDetailMenu = root;
  currentFlowStep = null;
  document.getElementById('detailShell').classList.add('grouped-detail');
  document.getElementById('detailKicker').textContent = section;
  document.getElementById('detailKicker').hidden = !section;
  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailIntro').textContent = description;
  document.getElementById('detailIntro').hidden = !description;
  document.getElementById('detailContent').classList.remove('reading-detail');
  document.getElementById('detailScroll').scrollTop = 0;
  document.getElementById('detailTop').hidden = true;
  syncDetailNavigation();
}
function renderNavigationIndex(root) {
  navigationState = { root, group: null, topic: null };
  currentDetailView = 'index'; currentResourceSelection = null;
  navigationFrame(root, ibexNavigation[root][currentLang]);
  document.getElementById('detailContent').innerHTML = `<div class="navigation-groups">${navigationGroupButtons(root)}</div>`;
}
function renderNavigationGroup(root, groupId) {
  const group = ibexNavigation[root]?.groups.find(item => item.id === groupId);
  if (!group) return;
  navigationState = { root, group: groupId, topic: null };
  currentDetailView = 'resource'; currentResourceSelection = null;
  navigationFrame(root, group[currentLang]);
  const menus = currentLang === 'en' ? headerMenusEN : headerMenus;
  document.getElementById('detailContent').innerHTML = group.sources.map(([key, index, items]) => {
    const source = menus[key].groups[index];
    const heading = group.sources.length > 1 ? `<h3>${esc(key === 'product' && group.id === 'data' ? 'Datahub' : source.t)}</h3>` : '';
    return `<section class="navigation-section">${heading}<div class="navigation-topics">${items.map(itemIndex => {
      const item = source.items[itemIndex];
      return `<button type="button" class="nav-choice nav-topic" data-nav-topic="${key}" data-nav-source-group="${index}" data-nav-item="${itemIndex}">${ibexMenuIcon(key, index, itemIndex)}<span><strong>${esc(item[0])}</strong><small>${esc(item[1])}</small></span><span class="nav-choice-arrow" aria-hidden="true">›</span></button>`;
    }).join('')}</div></section>`;
  }).join('');
}
function renderNavigationDetail(key, focusGroup = -1) {
  const root = navigationRoot(key);
  if (!ibexNavigation[root]) return;
  const group = focusGroup >= 0 ? navigationGroupFor(key, focusGroup, 0) : key === 'ai' ? ibexNavigation.product.groups.find(g => g.id === 'data') : key === 'industry' ? ibexNavigation.solution.groups.find(g => g.id === 'industries') : null;
  if (group) renderNavigationGroup(root, group.id); else renderNavigationIndex(root);
}
function renderNavigationArticle(key, groupIndex, itemIndex) {
  const root = navigationRoot(key), group = navigationGroupFor(key, groupIndex, itemIndex);
  const menus = currentLang === 'en' ? headerMenusEN : headerMenus;
  const item = menus[key]?.groups[groupIndex]?.items[itemIndex];
  if (!group || !item) return;
  navigationState = { root, group: group.id, topic: { key, groupIndex, itemIndex } };
  currentDetailView = 'resource'; currentDetailFocus = groupIndex;
  currentResourceSelection = { key, groupIndex, itemIndex };
  navigationFrame(root, item[0], item[1], key === 'ai' ? menus.ai.groups[groupIndex].t : '');
  document.getElementById('detailContent').innerHTML = `<section class="resource-inline open" id="resourceInline">${continuousArticleMarkup(key, groupIndex, itemIndex, currentLang === 'en')}</section>`;
}
function syncGroupedNavigation() {
  const { root, group: groupId, topic } = navigationState;
  const menu = ibexNavigation[root], group = menu.groups.find(item => item.id === groupId);
  const back = document.getElementById('detailBack'), crumb = document.getElementById('detailBreadcrumb');
  back.hidden = !group;
  back.textContent = `← ${topic ? group[currentLang] : menu[currentLang]}`;
  crumb.classList.add('visible');
  crumb.textContent = [menu[currentLang], group?.[currentLang]].filter(Boolean).join(' / ');
}
function backGroupedNavigation() {
  if (!navigationState) return;
  const { root, group, topic } = navigationState;
  if (topic) renderNavigationGroup(root, group); else renderNavigationIndex(root);
  const selector = topic ? `[data-nav-topic="${topic.key}"][data-nav-source-group="${topic.groupIndex}"][data-nav-item="${topic.itemIndex}"]` : `[data-nav-group="${group}"]`;
  document.getElementById('detailContent').querySelector(selector)?.focus({ preventScroll: true });
}
function restoreNavigation(state) {
  if (state.topic) renderNavigationArticle(state.topic.key, state.topic.groupIndex, state.topic.itemIndex);
  else if (state.group) renderNavigationGroup(state.root, state.group);
  else renderNavigationIndex(state.root);
}
function onNavigationClick(event) {
  const group = event.target.closest('[data-nav-group]'), topic = event.target.closest('[data-nav-topic]');
  if (!group && !topic) return;
  if (group) {
    renderNavigationGroup(group.dataset.navRoot, group.dataset.navGroup);
    closeHeaderMenu(); closeMobileNav();
    menuDetail.hidden = false; document.body.classList.add('detail-open');
  } else renderNavigationArticle(topic.dataset.navTopic, Number(topic.dataset.navSourceGroup), Number(topic.dataset.navItem));
  document.getElementById('detailBack').focus({ preventScroll: true });
}
document.getElementById('megaGrid').addEventListener('click', onNavigationClick);
document.getElementById('detailContent').addEventListener('click', onNavigationClick);
