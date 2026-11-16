// Tests the Pararius Office connection and shows how the feed is converted into listings.
// Nothing is built or deployed; the token is never printed.
//
//   npm run feed:test                          → sample export in tests/fixtures/
//   npm run feed:test -- export.json           → a saved export (JSON or XML)
//   npm run feed:test -- https://…             → the live API (needs PARARIUS_OFFICE_TOKEN)
//   npm run feed:test                          → with PARARIUS_OFFICE_URL + _TOKEN set: the live API
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const arg = process.argv[2];
if (arg) process.env.PARARIUS_OFFICE_URL = /^https?:/.test(arg) ? arg : pathToFileURL(resolve(arg)).href;
else if (!process.env.PARARIUS_OFFICE_URL) process.env.PARARIUS_OFFICE_URL = pathToFileURL(resolve('tests/fixtures/pararius-office.sample.json')).href;

const src = await import('../src/content/sources/pararius-office.ts');
const url = process.env.PARARIUS_OFFICE_URL;
console.log(`Bron:   ${url.startsWith('file:') ? decodeURIComponent(url) : url}`);
console.log(`Token:  ${src.CONFIG.token ? `ingesteld (${src.CONFIG.token.length} tekens), verstuurd als "${src.CONFIG.auth}"` : 'niet ingesteld'}\n`);

let listings;
try {
  listings = await src.fetchParariusOffice();
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(1);
}

if (!listings.length) {
  console.log('⚠ Geen woningen gevonden. Klopt het endpoint? Staat er aanbod online? Bekijk de ruwe respons en pas FIELDS aan in src/content/sources/pararius-office.ts.');
  process.exit(1);
}

console.table(listings.map((l) => ({
  id: l.id, adres: l.address, postcode: l.postalCode ?? '(PDOK)', plaats: l.city, wijk: l.neighbourhood || '(PDOK)',
  huur: l.rent, m2: l.area, slpk: l.bedrooms, status: l.status, beschikbaar: l.available,
  foto: l.photoUrl ? 'ja' : '-', link: l.url ? 'ja' : '-', pin: l.lat ? 'feed' : '(PDOK)',
})));

const warn = [];
for (const l of listings) {
  if (!l.area) warn.push(`${l.address}: geen woonoppervlakte gevonden (FIELDS.area)`);
  if (!l.bedrooms) warn.push(`${l.address}: geen slaapkamers gevonden (FIELDS.bedrooms)`);
  if (!l.photoUrl) warn.push(`${l.address}: geen foto gevonden (FIELDS.photos) — de kaart toont dan een illustratie`);
}
if (warn.length) console.log('\nControleer:\n  • ' + warn.join('\n  • '));
console.log(`\n✔ ${listings.length} woning(en) worden getoond. Verhuurde/ingetrokken woningen zijn weggelaten.`);
