'use strict';

let launchOffer = { schema: 2, plans: [] }, launchOfferClockOffset = 0, launchOfferExpiryTimer;
function activePlanOffer(planId) {
  const now = Date.now() + launchOfferClockOffset;
  return launchOffer?.plans?.find(row => row.planId === planId && now >= row.startsAt && now < row.expiresAt) || null;
}
function offerPeriod(offer, en) {
  const locale = en ? 'en-US' : 'mn-MN', format = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Ulaanbaatar' });
  return `${format.format(new Date(offer.startsAt))} — ${format.format(new Date(offer.expiresAt - 1))}`;
}
function renderPricingOfferPanel() {
  const panel = document.getElementById('pricingOfferPanel');
  if (!panel) return;
  const en = currentLang === 'en', plans = pricingPlans.filter(plan => plan.enabled), selected = selectedPaymentPlan === null ? null : plans[selectedPaymentPlan];
  const rows = selected ? [activePlanOffer(selected.id)].filter(Boolean) : launchOffer.plans.filter(row => activePlanOffer(row.planId));
  panel.classList.toggle('empty', rows.length === 0);
  panel.innerHTML = `<span class="pricing-offer-kicker">${en ? 'CURRENT OFFERS' : 'ИДЭВХТЭЙ УРАМШУУЛАЛ'}</span>${rows.length ? rows.map(offer => {
    const plan = plans.find(row => row.id === offer.planId), name = en ? offer.nameEn : offer.nameMn, detail = en ? offer.badgeEn : offer.badgeMn, custom = en ? offer.textEn : offer.textMn;
    return `<article><strong>${esc(plan?.name || offer.planId)} · ${esc(name)}</strong><p>${esc(custom || detail)}</p><small>${esc(offerPeriod(offer, en))}</small></article>`;
  }).join('') : `<p>${en ? 'There is no active administrator-configured offer for this selection.' : 'Энэ сонголтод админаас тохируулсан идэвхтэй урамшуулал одоогоор байхгүй.'}</p>`}`;
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
  renderPricingOfferPanel();
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
