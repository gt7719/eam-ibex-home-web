'use strict';

let launchOffer = null, launchOfferClockOffset = 0, launchOfferExpiryTimer;
function visibleLaunchOffer() {
  const now = Date.now() + launchOfferClockOffset;
  return launchOffer && now < launchOffer.expiresAt ? launchOffer : null;
}
function renderLaunchOffer() {
  megaMenu.classList.toggle('pricing-offer-menu', activeHeaderMenu === 'pricing');
  document.querySelectorAll('.launch-offer-banner, .launch-offer-badge').forEach(node => node.remove());
  clearTimeout(launchOfferExpiryTimer);
  const offer = visibleLaunchOffer();
  if (!offer) return;
  const plans = pricingPlans.filter(plan => plan.enabled && (offer.scope === 'all' || offer.planIds.includes(plan.id)));
  if (!plans.length) return;
  const en = currentLang === 'en', title = en ? offer.textEn : offer.textMn;
  const upcoming = Date.now() + launchOfferClockOffset < offer.startsAt;
  const startNotice = upcoming ? (en ? `Starts on ${offer.startDate}` : `${offer.startDate} өдрөөс эхэлнэ`) : '';
  const scope = offer.scope === 'all' ? (en ? 'All plans' : 'Бүх багц') : plans.map(plan => plan.name).join(', ');
  function banner() {
    const node = document.createElement('aside'); node.className = 'launch-offer-banner';
    node.innerHTML = `<strong>${esc(title)}</strong>${upcoming ? `<span>${esc(startNotice)}</span>` : ''}<span>${en ? 'Applicable plans' : 'Хамаарах багц'}: ${esc(scope)}</span>`;
    return node;
  }
  if (activeHeaderMenu === 'pricing') megaMenu.querySelector('.mega-head').append(banner());
  if (currentDetailMenu === 'pricing') document.querySelector('.detail-head-copy').append(banner());
  for (const [selector, attribute] of [['#megaGrid [data-plan]', 'plan'], ['#detailContent [data-detail-plan]', 'detailPlan']]) {
    const visiblePlans = pricingPlans.filter(plan => plan.enabled);
    document.querySelectorAll(selector).forEach(card => {
      const plan = visiblePlans[Number(card.dataset[attribute])];
      if (!plan || !plans.some(row => row.id === plan.id)) return;
      const badge = document.createElement('span'); badge.className = 'launch-offer-badge';
      badge.textContent = en ? offer.badgeEn : offer.badgeMn;
      card.querySelector('h3')?.after(badge);
    });
  }
  launchOfferExpiryTimer = setTimeout(renderLaunchOffer, Math.min(2147483647, Math.max(1, offer.expiresAt - Date.now() - launchOfferClockOffset)));
}
async function refreshLaunchOffer() {
  try {
    const response = await fetch('/api/launch-offer', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offer unavailable');
    const payload = await response.json();
    launchOffer = payload.offer;
    launchOfferClockOffset = Number.isFinite(payload.serverNow) ? payload.serverNow - Date.now() : 0;
  } catch { launchOffer = null; }
  renderLaunchOffer();
}
const launchOfferHeaderRenderer = renderHeaderMenu;
renderHeaderMenu = function (...args) {
  const result = launchOfferHeaderRenderer.apply(this, args);
  renderLaunchOffer();
  return result;
};
const launchOfferDetailRenderer = renderDetailContent;
renderDetailContent = function (...args) {
  const result = launchOfferDetailRenderer.apply(this, args);
  renderLaunchOffer();
  return result;
};
refreshLaunchOffer();
setInterval(() => { if (!document.hidden) refreshLaunchOffer(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLaunchOffer(); });
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.data?.type === 'ibex-launch-offer-updated') refreshLaunchOffer();
});
