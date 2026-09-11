import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOfferEndDate, defaultLaunchOffer, validateLaunchOffer, publicLaunchOffer, launchOfferBadge, launchOfferText, offerDate } from '../app/lib/launch-offer-model.ts';

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
test('offer rejects invalid dates, durations, flags and empty or unknown plan selections', () => {
  for (const patch of [{ durationValue: 0 }, { durationValue: 121 }, { durationValue: 11, durationUnit: 'year' }, { durationUnit: 'week' }, { enabled: 'true' }, { startDate: '2026-02-30' }, { enabled: true }, { scope: 'selected' }, { planIds: ['missing'] }, { nameMn: '' }, { qualifierMn: 'a'.repeat(41) }, { textEn: 'a'.repeat(241) }])
    assert.throws(() => validateLaunchOffer({ ...defaultLaunchOffer, ...patch }));
  const offer = validateLaunchOffer({ ...defaultLaunchOffer, scope: 'selected', planIds: ['go', 'plus', 'go'] });
  assert.deepEqual(offer.planIds, ['go', 'plus']);
});
test('automatic and customized text use the selected day, month or year duration', () => {
  const base = { ...defaultLaunchOffer, nameMn: 'Хаврын урамшуулал', nameEn: 'Spring offer' };
  assert.equal(launchOfferBadge({ ...base, durationValue: 10, durationUnit: 'day' }, 'mn'), 'Эхний 10 өдөр үнэгүй');
  assert.equal(launchOfferBadge({ ...base, durationValue: 6, durationUnit: 'month' }, 'en'), 'First 6 months free');
  assert.equal(launchOfferText({ ...base, durationValue: 1, durationUnit: 'year' }, 'mn'), 'Хаврын урамшуулал — Эхний 1 жил үнэгүй');
  assert.equal(launchOfferText({ ...base, durationValue: 1, durationUnit: 'year' }, 'en'), 'Spring offer — First 1 year free');
  assert.equal(launchOfferText({ ...base, qualifierMn: '', durationValue: 1, durationUnit: 'year' }, 'mn'), 'Хаврын урамшуулал — 1 жил үнэгүй');
  assert.equal(launchOfferText({ ...base, textEn: '{name}: {qualifier} {duration} free', durationValue: 10, durationUnit: 'day' }, 'en'), 'Spring offer: First 10 days free');
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
  assert.equal(offer.qualifierMn, 'Эхний');
  assert.equal(offer.durationUnit, 'day');
  assert.equal(offer.endDate, '2027-03-31');
  assert.equal('freeMonths' in offer, false);
});
