import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// CONFIG is read when the module loads, so point it at the sample export first.
process.env.PARARIUS_OFFICE_URL = pathToFileURL(resolve('tests/fixtures/pararius-office.sample.json')).href;
const { mapItem, findItems, fetchParariusOffice } = await import('../../src/content/sources/pararius-office.ts');
type L = NonNullable<ReturnType<typeof mapItem>>;
const isL = (x: L | null): x is L => x !== null;
const NOW = new Date('2026-11-16T12:00:00Z');

test('Pararius Office (JSON): items found, statuses, prices, dates and city mapped', async () => {
  const data = JSON.parse(await readFile('tests/fixtures/pararius-office.sample.json', 'utf8'));
  const items = findItems(data);
  assert.equal(items.length, 4);
  const list = items.map((i) => mapItem(i, NOW)).filter(isL);
  assert.equal(list.length, 3, 'rented listing is left out');

  const [a, b, c] = list;
  assert.equal(a.address, 'Frederik Hendriklaan 120');
  assert.equal(a.city, 'Den Haag', "'s-Gravenhage is shown as Den Haag");
  assert.equal(a.postalCode, '2582 BG');
  assert.equal(a.rent, 1950, '"€ 1.950,-" is parsed');
  assert.equal(a.area, 78);
  assert.equal(a.status, 'new', 'published 2 days ago');
  assert.equal(a.available, '2027-01-01');
  assert.match(a.url ?? '', /^https:\/\/www\.pararius\.nl\//);

  assert.equal(b.status, 'option');
  assert.equal(b.available, 'option');
  assert.equal(b.bedrooms, 2, '"2" as string');

  assert.equal(c.rent, 1475, '"1475.00" is parsed');
  assert.equal(c.status, 'avail');
  assert.equal(c.available, '2026-12-01', 'Dutch date 01-12-2026');
  assert.equal(c.postalCode, undefined, 'missing postcode is filled in later by PDOK');
});

test('Pararius Office (XML): Dutch element names and photo list', async () => {
  const { XMLParser } = await import('fast-xml-parser');
  const xml = await readFile('tests/fixtures/pararius-office.sample.xml', 'utf8');
  const data = new XMLParser({ ignoreAttributes: false, isArray: (n) => /^(object|foto)$/.test(n) }).parse(xml);
  const [l] = findItems(data).map((i) => mapItem(i, NOW)).filter(isL);
  assert.equal(l.address, 'Gevers Deynootweg 50');
  assert.equal(l.city, 'Den Haag');
  assert.equal(l.rent, 2100);
  assert.equal(l.photoUrl, 'https://example.com/fotos/2001-1.jpg');
});

test('Pararius Office: unusable items are skipped, never invented', () => {
  assert.equal(mapItem({ status: 'beschikbaar' }, NOW), null, 'no address/price');
  assert.equal(mapItem({ street: 'Teststraat', houseNumber: 1, city: 'Den Haag', rent: 'n.o.t.k.' }, NOW), null, 'no numeric rent');
  assert.equal(mapItem({ street: 'Teststraat', houseNumber: 1, city: 'Den Haag', rent: 1000, photos: ['http://insecure.example/x.jpg'] }, NOW)?.photoUrl, undefined, 'only https photos');
});

test('Pararius Office: status words', () => {
  const base = { street: 'Teststraat', houseNumber: 1, city: 'Den Haag', rent: 1000 };
  assert.equal(mapItem({ ...base, status: 'To let' }, NOW)?.status, 'avail', '"To let" means available, not rented');
  assert.equal(mapItem({ ...base, status: 'Let agreed' }, NOW), null);
  assert.equal(mapItem({ ...base, status: 'Verhuurd onder voorbehoud' }, NOW), null);
  assert.equal(mapItem({ ...base, status: 'Under option' }, NOW)?.status, 'option');
});

test('Pararius Office: fetch reads a file:// export end-to-end', async () => {
  const list = await fetchParariusOffice();
  assert.equal(list.length, 3);
});
