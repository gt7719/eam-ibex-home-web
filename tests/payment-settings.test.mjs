import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPaymentMethods, normalizePaymentMethods } from '../app/lib/payment-settings.ts';

test('legacy payment settings gain empty media and app fields', () => {
  const methods = normalizePaymentMethods(defaultPaymentMethods.map(method => ({ id: method.id, labelMn: method.labelMn, labelEn: method.labelEn, detailMn: method.detailMn, detailEn: method.detailEn, checkoutUrl: method.checkoutUrl, enabled: method.enabled })));
  assert.equal(methods.find(method => method.id === 'qr').imageUrl, '');
  assert.deepEqual(methods.find(method => method.id === 'bank_app').apps, []);
});

test('QR accepts only a directly uploaded local media image', () => {
  const valid = defaultPaymentMethods.map(method => method.id === 'qr' ? { ...method, imageUrl: '/api/media/qr_123' } : method);
  assert.equal(normalizePaymentMethods(valid).find(method => method.id === 'qr').imageUrl, '/api/media/qr_123');
  const invalid = defaultPaymentMethods.map(method => method.id === 'qr' ? { ...method, imageUrl: 'https://example.com/qr.png' } : method);
  assert.throws(() => normalizePaymentMethods(invalid));
});

test('visible bank apps require names, direct image and HTTPS link while preserving order', () => {
  const apps = [
    { id: 'bank-a', nameMn: 'Банк А', nameEn: 'Bank A', imageUrl: '/api/media/a', bankUrl: 'https://bank.example/pay', enabled: true },
    { id: 'draft', nameMn: '', nameEn: '', imageUrl: '', bankUrl: '', enabled: false },
  ];
  const valid = defaultPaymentMethods.map(method => method.id === 'bank_app' ? { ...method, apps } : method);
  assert.deepEqual(normalizePaymentMethods(valid).find(method => method.id === 'bank_app').apps.map(app => app.id), ['bank-a', 'draft']);
  const insecure = defaultPaymentMethods.map(method => method.id === 'bank_app' ? { ...method, apps: [{ ...apps[0], bankUrl: 'http://bank.example/pay' }] } : method);
  assert.throws(() => normalizePaymentMethods(insecure));
  const incomplete = defaultPaymentMethods.map(method => method.id === 'bank_app' ? { ...method, apps: [{ ...apps[0], imageUrl: '' }] } : method);
  assert.throws(() => normalizePaymentMethods(incomplete));
});
