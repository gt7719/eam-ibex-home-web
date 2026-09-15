import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('public offers render only as plan-specific badges with automatic expiry', () => {
  const script = fs.readFileSync(new URL('../public/launch-offer.js', import.meta.url), 'utf8');
  assert.match(script, /activePlanOffer\(planId\)/);
  assert.match(script, /row\.planId === planId/);
  assert.match(script, /offer\.expiresAt/);
  assert.match(script, /dataset\.planOffer/);
  assert.doesNotMatch(script, /launch-offer-banner/);
});

test('pricing uses custom duration input and administrator-defined plan limits', () => {
  const html = fs.readFileSync(new URL('../public/concept.html', import.meta.url), 'utf8');
  assert.match(html, /id="billingDuration"/);
  assert.match(html, /id="billingUnit"/);
  assert.match(html, /minPaidMonths/);
  assert.match(html, /maxPaidMonths/);
  assert.match(html, /Total service duration|Нийт үйлчилгээний хугацаа/);
  assert.doesNotMatch(html, /data-billing="monthly"/);
});
