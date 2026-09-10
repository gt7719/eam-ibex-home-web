import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLaunchOffer, validateLaunchOffer, publicLaunchOffer, launchOfferText, offerDate } from '../app/lib/launch-offer-model.ts';

test('offer starts and ends on inclusive Ulaanbaatar calendar days, and defaults to hidden', () => {
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, enabled: true, startDate: '2026-09-10', endDate: '2026-09-12' });
  assert.equal(publicLaunchOffer(defaultLaunchOffer), null);
  assert.equal(offerDate('2026-09-10'), Date.parse('2026-09-09T16:00:00Z'));
  assert.ok(publicLaunchOffer(offer, Date.parse('2026-09-09T15:59:59Z')));
  assert.ok(publicLaunchOffer(offer, Date.parse('2026-09-09T16:00:00Z')));
  assert.ok(publicLaunchOffer(offer, Date.parse('2026-09-12T15:59:59.999Z')));
  assert.equal(publicLaunchOffer(offer, Date.parse('2026-09-12T16:00:00Z')), null);
  assert.equal(publicLaunchOffer({ ...offer, enabled: false }, offerDate(offer.startDate)), null);
  assert.ok(publicLaunchOffer({ ...offer, showInPricing: false }, offerDate(offer.startDate)));
});
test('offer rejects invalid dates, months, flags and empty or unknown plan selections', () => {
  for (const patch of [{ freeMonths: 0 }, { freeMonths: 1.5 }, { freeMonths: 121 }, { enabled: 'true' }, { startDate: '2026-02-30' }, { startDate: '2026-12-01', endDate: '2026-11-30' }, { enabled: true }, { scope: 'selected' }, { planIds: ['missing'] }, { textEn: 'a'.repeat(241) }])
    assert.throws(() => validateLaunchOffer({ ...defaultLaunchOffer, ...patch }));
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, scope: 'selected', planIds: ['go', 'plus', 'go'] });
  assert.deepEqual(offer.planIds, ['go', 'plus']);
});
test('bilingual automatic and customized text use the configured free months', () => {
  const offer = { ...defaultLaunchOffer, freeMonths: 6 };
  assert.match(launchOfferText(offer, 'mn'), /6 сар үнэгүй/);
  assert.match(launchOfferText(offer, 'en'), /6 months free/);
  assert.equal(launchOfferText({ ...offer, textEn: 'Welcome: {months} free months' }, 'en'), 'Welcome: 6 free months');
});
