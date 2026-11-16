// Pre-launch checklist: lists what is still missing before the site may go live.
// Usage: npm run build && npm run launch-check   (exit code 1 = blockers found)
import { readFile, readdir, access } from 'node:fs/promises';

const blockers = [], todo = [], ok = [];
const read = (f) => readFile(f, 'utf8').catch(() => '');
const exists = (f) => access(f).then(() => true, () => false);

const site = await read('src/content/site.ts');
(/kvk: '\s*'/.test(site) ? blockers : ok).push('KvK-nummer in src/content/site.ts (wettelijk verplicht op de website)');
(/sameAs: \[\] as/.test(site) ? todo : ok).push('Google Business Profile / socials in site.sameAs (lokale SEO)');

const photos = await readdir('src/assets/photos').catch(() => []);
for (const key of ['hero', 'over-ons', 'verhuren']) {
  (photos.some((f) => f.replace(/\.[^.]+$/, '') === key) ? ok : todo).push(`Foto "${key}" in src/assets/photos/ (nu: illustratie)`);
}
const listings = await read('src/content/listings.ts');
if (process.env.PARARIUS_OFFICE_TOKEN && process.env.PARARIUS_OFFICE_URL) ok.push('Woningaanbod via Pararius Office (test de koppeling met `npm run feed:test`)');
else (/const LISTINGS: Listing\[\] = \[\];/.test(listings) ? todo : ok).push('Woningaanbod: Pararius Office-token + endpoint (zie README §6) of handmatig in src/content/listings.ts');
const reviews = await read('src/content/reviews.ts');
(/const REVIEWS: Review\[\] = \[\];/.test(reviews) ? todo : ok).push('Echte klantervaringen in src/content/reviews.ts (sectie is nu verborgen)');

if (!(await exists('dist/client/index.html'))) blockers.push('Geen build gevonden: voer eerst `npm run build` uit');
else {
  const home = await read('dist/client/index.html');
  (home.includes('demo-banner') || home.includes('noindex') ? blockers : ok).push('Build is geen demo-build en is indexeerbaar');
  const canonical = home.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? '';
  (canonical.startsWith('https://') ? ok : blockers).push(`Canonieke URL gebruikt https (nu: ${canonical || 'ontbreekt'})`);
  todo.push(`Controleer het domein: ${canonical} (zet SITE_URL vóór de build)`);
}

const env = process.env;
const envOk = (k, cond = (v) => !!v) => (cond(env[k]) ? ok : blockers).push(`Omgevingsvariabele ${k}`);
if (env.NODE_ENV === 'production') {
  envOk('SITE_URL', (v) => v?.startsWith('https://'));
  envOk('FORM_SECRET', (v) => (v ?? '').length >= 32);
  envOk('SMTP_HOST'); envOk('MAIL_FROM'); envOk('MAIL_TO');
} else todo.push('Omgevingsvariabelen: draai dit script op de server met NODE_ENV=production om ze te controleren');

const print = (title, list, mark) => list.length && console.log(`\n${title}\n${list.map((l) => `  ${mark} ${l}`).join('\n')}`);
print('BLOKKEREND voor livegang:', blockers, '✖');
print('Nog aan te leveren / aan te raden:', todo, '•');
print('In orde:', ok, '✔');
console.log('');
process.exit(blockers.length ? 1 : 0);
