import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOfferEndDate, defaultLaunchOffer, validateLaunchOffer, publicLaunchOffer, launchOfferText, offerDate } from '../app/lib/launch-offer-model.ts';

test('active offer is announced before its start and ends after its inclusive Ulaanbaatar calendar day', () => {
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, enabled: true, startDate: '2026-09-10', durationValue: 3, durationUnit: 'day', endDate: '' });
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
  for (const patch of [{ freeMonths: 0 }, { freeMonths: 1.5 }, { freeMonths: 121 }, { durationValue: 0 }, { durationUnit: 'week' }, { enabled: 'true' }, { startDate: '2026-02-30' }, { enabled: true }, { scope: 'selected' }, { planIds: ['missing'] }, { nameMn: '' }, { textEn: 'a'.repeat(241) }])
    assert.throws(() => validateLaunchOffer({ ...defaultLaunchOffer, ...patch }));
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, scope: 'selected', planIds: ['go', 'plus', 'go'] });
  assert.deepEqual(offer.planIds, ['go', 'plus']);
});
test('bilingual automatic and customized text use the configured free months', () => {
  const offer = { ...defaultLaunchOffer, nameMn: 'Хаврын урамшуулал', nameEn: 'Spring offer', freeMonths: 6 };
  assert.match(launchOfferText(offer, 'mn'), /6 сар үнэгүй/);
  assert.match(launchOfferText(offer, 'mn'), /Хаврын урамшуулал/);
  assert.match(launchOfferText(offer, 'en'), /6 months free/);
  assert.equal(launchOfferText({ ...offer, textEn: '{name}: {months} free months' }, 'en'), 'Spring offer: 6 free months');
});

test('duration computes an inclusive end date in days, months or years', () => {
  assert.equal(calculateOfferEndDate('2026-10-01', 6, 'month'), '2027-03-31');
  assert.equal(calculateOfferEndDate('2026-10-01', 10, 'day'), '2026-10-10');
  assert.equal(calculateOfferEndDate('2026-10-01', 1, 'year'), '2027-09-30');
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, startDate: '2026-10-01', durationValue: 6, durationUnit: 'month', endDate: '2099-01-01' });
  assert.equal(offer.endDate, '2027-03-31');
});

test('legacy offer keeps its historical end date by migrating to an inclusive day duration', () => {
  const legacy = { freeMonths: 6, textMn: '', textEn: '', startDate: '2026-10-01', endDate: '2027-03-31', scope: 'all', planIds: [], enabled: true, showInPricing: true };
  const offer = validateLaunchOffer(legacy);
  assert.equal(offer.nameMn, 'Нээлтийн урамшуулал');
  assert.equal(offer.durationUnit, 'day');
  assert.equal(offer.endDate, '2027-03-31');
});
