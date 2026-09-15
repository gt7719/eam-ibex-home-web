'use strict';

let launchOffer = { schema: 2, plans: [] }, launchOfferClockOffset = 0, launchOfferExpiryTimer;
function activePlanOffer(planId) {
  const now = Date.now() + launchOfferClockOffset;
  return launchOffer?.plans?.find(row => row.planId === planId && now >= row.startsAt && now < row.expiresAt) || null;
}
function renderLaunchOffer() {
  document.querySelectorAll('.launch-offer-badge').forEach(node => node.remove());
  clearTimeout(launchOfferExpiryTimer);
  let nextExpiry = Infinity;
  for (const [selector, attribute] of [['#megaGrid [data-plan]', 'plan'], ['#detailContent [data-detail-plan]', 'detailPlan']]) {
    const visiblePlans = pricingPlans.filter(plan => plan.enabled);
    document.querySelectorAll(selector).forEach(card => {
      const plan = visiblePlans[Number(card.dataset[attribute])], offer = plan && activePlanOffer(plan.id);
      if (!offer) return;
      const badge = document.createElement('span'); badge.className = 'launch-offer-badge';
      badge.textContent = currentLang === 'en' ? offer.badgeEn : offer.badgeMn;
      badge.dataset.planOffer = plan.id; card.querySelector('h3')?.after(badge);
      nextExpiry = Math.min(nextExpiry, offer.expiresAt);
    });
  }
  if (Number.isFinite(nextExpiry)) launchOfferExpiryTimer = setTimeout(renderLaunchOffer, Math.min(2147483647, Math.max(1, nextExpiry - Date.now() - launchOfferClockOffset)));
}
async function refreshLaunchOffer() {
  try {
    const response = await fetch('/api/launch-offer', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offer unavailable');
    const payload = await response.json(); launchOffer = payload.offer || { schema: 2, plans: [] };
    launchOfferClockOffset = Number.isFinite(payload.serverNow) ? payload.serverNow - Date.now() : 0;
  } catch { launchOffer = { schema: 2, plans: [] }; }
  renderLaunchOffer();
}
const launchOfferHeaderRenderer = renderHeaderMenu;
renderHeaderMenu = function (...args) { const result = launchOfferHeaderRenderer.apply(this, args); renderLaunchOffer(); return result; };
const launchOfferDetailRenderer = renderDetailContent;
renderDetailContent = function (...args) { const result = launchOfferDetailRenderer.apply(this, args); renderLaunchOffer(); return result; };
refreshLaunchOffer();
setInterval(() => { if (!document.hidden) refreshLaunchOffer(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLaunchOffer(); });
window.addEventListener('message', event => { if (event.origin === location.origin && event.data?.type === 'ibex-launch-offer-updated') refreshLaunchOffer(); });
