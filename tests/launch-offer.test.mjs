import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOfferEndDate, defaultLaunchOffer, validateLaunchOffer, publicLaunchOffer, launchOfferText, offerDate } from '../app/lib/launch-offer-model.ts';

test('plan offers keep duration bonuses and price discounts independent', () => {
  const input = structuredClone(defaultLaunchOffer), go = input.plans.find(plan => plan.planId === 'go');
  Object.assign(go, { bonusEnabled:true, bonusValue:6, bonusUnit:'month', discountEnabled:true, discountType:'percent', discountValue:15, combineBenefits:true, startDate:'2026-09-10', endDate:'2027-09-10' });
  const offer = validateLaunchOffer(input), active = publicLaunchOffer(offer, offerDate('2026-09-10'));
  assert.equal(active.plans.length, 1);
  assert.equal(active.plans[0].planId, 'go');
  assert.match(active.plans[0].badgeMn, /6 сар үнэгүй \+ 15% хөнгөлөлт/);
  const ended = publicLaunchOffer(offer, offerDate('2027-09-11')).plans;
  assert.equal(ended.length, 1);
  assert.equal(ended[0].pricingActive, false);
  assert.equal(ended[0].displayState, 'ended');
});

test('free never receives a price discount and invalid ranges are rejected', () => {
  const input = structuredClone(defaultLaunchOffer), free = input.plans[0];
  Object.assign(free, { discountEnabled:true, discountType:'percent', discountValue:20, startDate:'2026-09-10', endDate:'2026-12-31' });
  assert.equal(validateLaunchOffer(input).plans[0].discountEnabled, false);
  const bad = structuredClone(defaultLaunchOffer); bad.plans[1].bonusValue = 121;
  assert.throws(() => validateLaunchOffer(bad));
  bad.plans[1].bonusValue = 1; bad.plans[1].bonusEnabled = true;
  assert.throws(() => validateLaunchOffer(bad));
});

test('legacy global offers migrate to selected plan bonuses without data loss', () => {
  const legacy = { nameMn:'Нээлт', nameEn:'Launch', durationValue:3, durationUnit:'month', textMn:'', textEn:'', startDate:'2026-10-01', endDate:'2026-12-31', scope:'selected', planIds:['go','plus'], enabled:true };
  const migrated = validateLaunchOffer(legacy);
  assert.equal(migrated.schema, 2);
  assert.equal(migrated.plans.find(p=>p.planId==='go').bonusEnabled, true);
  assert.equal(migrated.plans.find(p=>p.planId==='pro').bonusEnabled, false);
  assert.equal(launchOfferText(migrated.plans[1], 'en'), '3 months free');
});

test('duration helper retains calendar-safe inclusive calculations', () => {
  assert.equal(calculateOfferEndDate('2026-10-01', 6, 'month'), '2027-03-31');
  assert.equal(calculateOfferEndDate('2026-10-01', 10, 'day'), '2026-10-10');
  assert.equal(calculateOfferEndDate('2026-10-01', 1, 'year'), '2027-09-30');
});
