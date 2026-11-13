import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone, normalizeEmail, normalizePostcode, parseAmount, checkDate, validateForm, cleanText,
} from '../../src/lib/forms/validate.ts';

test('phone numbers are normalised to E.164', () => {
  assert.equal(normalizePhone('06 - 24 50 61 05'), '+31624506105');
  assert.equal(normalizePhone('06-24506105'), '+31624506105');
  assert.equal(normalizePhone('+31 6 24506105'), '+31624506105');
  assert.equal(normalizePhone('+31 (0)6 24506105'), '+31624506105');
  assert.equal(normalizePhone('0031 70 123 4567'), '+31701234567');
  assert.equal(normalizePhone('070-1234567'), '+31701234567');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('+1 (415) 555-0100'), '+14155550100');
  for (const bad of ['12345', '0612345', '06123456789', 'abc', '+31 6 123', '++31612345678', '+0612345678', '1234567890'])
    assert.equal(normalizePhone(bad), null, bad);
});

test('e-mail validation', () => {
  assert.equal(normalizeEmail('Jan.Jansen@Example.NL'), 'Jan.Jansen@example.nl');
  for (const bad of ['jan', 'jan@', 'jan@nl', 'a b@c.nl', 'jan@@c.nl', 'x@y.c', '.a@b.nl', 'a@b..nl', 'a@b.nl\nBcc: x@y.nl'])
    assert.equal(normalizeEmail(bad), null, bad);
});

test('postcode validation', () => {
  assert.equal(normalizePostcode('2583em'), '2583 EM');
  assert.equal(normalizePostcode('2583 EM'), '2583 EM');
  assert.equal(normalizePostcode('0583 EM'), null);
  assert.equal(normalizePostcode('2583 SS'), null);
  assert.equal(normalizePostcode('25834 EM'), null);
});

test('amount parsing', () => {
  assert.equal(parseAmount('€ 1.950'), 1950);
  assert.equal(parseAmount('1950'), 1950);
  assert.equal(parseAmount('1.950,50'), 1951);
  assert.equal(parseAmount('2,500'), 2500);
  assert.equal(parseAmount('1950,-'), 1950);
  assert.equal(parseAmount('veel'), null);
  assert.equal(parseAmount('1.95.0'), null);
});

test('dates', () => {
  const now = new Date(Date.UTC(2026, 10, 13));
  assert.equal(checkDate('2026-12-01', now), null);
  assert.equal(checkDate('2026-11-13', now), null);
  assert.equal(checkDate('2026-02-30', now), 'date');
  assert.equal(checkDate('2020-01-01', now), 'date_past');
  assert.equal(checkDate('2035-01-01', now), 'date_far');
  assert.equal(checkDate('13-11-2026', now), 'date');
});

test('control characters are stripped', () => {
  assert.equal(cleanText('Jan\u0000 ‮Jansen\r\n'), 'Jan Jansen');
  assert.equal(cleanText('a\r\n\r\n\r\n\r\nb', true), 'a\n\nb');
});

test('search request: conditional fields follow the chosen profile', () => {
  const base = { lang: 'nl', name: 'Jan Jansen', email: 'jan@example.nl', consent: 'on' };
  const r = validateForm('zoekopdracht', { ...base, profile: 'student', institution: 'Haagse Hogeschool', employer: 'Ignored BV', extras: ['pets', 'lift'] });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.values.institution, 'Haagse Hogeschool');
  assert.equal(r.values.employer, undefined);
  assert.deepEqual(r.values.extras, ['pets', 'lift']);

  const bad = validateForm('zoekopdracht', { ...base, profile: 'working', contract: 'hacker', extras: ['x'], consent: '' });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.contract, 'choice');
  assert.equal(bad.errors.extras, 'choice');
  assert.equal(bad.errors.consent, 'consent');
});

test('letting form requires address, postcode and phone', () => {
  const r = validateForm('verhuur', { lang: 'nl', name: 'A B', email: 'a@b.nl', consent: true });
  assert.deepEqual(Object.keys(r.errors).sort(), ['address', 'phone', 'postcode']);
  const ok = validateForm('verhuur', { lang: 'en', address: 'Westduinweg 90', postcode: '2583em', phone: '0612345678', name: 'A B', email: 'a@b.nl', consent: true, area: '78 m²', rent: '€ 1.950' });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.equal(ok.values.postcode, '2583 EM');
  assert.equal(ok.values.area, 78);
  assert.equal(ok.values.rent, 1950);
  assert.equal(ok.values.phone, '+31612345678');
});

test('contact form rejects overly long input and unknown topics', () => {
  const r = validateForm('contact', { lang: 'nl', name: 'A B', email: 'a@b.nl', topic: 'buy', message: 'x'.repeat(2001) });
  assert.equal(r.errors.topic, 'choice');
  assert.equal(r.errors.message, 'too_long');
  const arr = validateForm('contact', { lang: 'nl', name: ['A', 'B'], email: 'a@b.nl', topic: 'find', message: 'Hallo daar' });
  assert.equal(arr.errors.name, 'choice');
});
