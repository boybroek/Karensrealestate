// Used by .github/workflows/woningaanbod.yml: has the offer in Pararius Office changed
// since the last deploy? Compares the fingerprint of the feed with /aanbod-versie.txt on the
// live site and writes changed=true|false to $GITHUB_OUTPUT. Never prints the token.
//
// Locally: PARARIUS_OFFICE_TOKEN=… PARARIUS_OFFICE_URL=… npm run feed:check
import { appendFileSync } from 'node:fs';

const { listingsFingerprint, listingSource } = await import('../src/content/listings.ts');
const liveBase = (process.env.LIVE_URL || process.env.SITE_URL || 'https://www.karensrealestate.nl').replace(/\/$/, '');

const current = `${listingSource()} ${await listingsFingerprint()}`;
let live = '';
try {
  const res = await fetch(`${liveBase}/aanbod-versie.txt`, { signal: AbortSignal.timeout(15_000), headers: { 'Cache-Control': 'no-cache' } });
  if (res.ok) live = (await res.text()).trim();
} catch { /* site not reachable or not deployed yet → rebuild */ }

const changed = current !== live;
console.log(`Feed: ${current}\nLive: ${live || '(onbekend)'}\n→ ${changed ? 'gewijzigd, opnieuw bouwen' : 'ongewijzigd, niets te doen'}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
