// Used by .github/workflows/woningaanbod.yml: has the offer changed since the last deploy?
// Compares the version of the listings API (api-worker/) with /aanbod-versie.txt on the live
// site and writes changed=true|false to $GITHUB_OUTPUT. Needs no secrets: the API is public.
// Visitors always see the live offer anyway (the browser reads the API); this rebuild only
// keeps the static HTML (what Google indexes) up to date.
import { appendFileSync } from 'node:fs';

const api = (process.env.LISTINGS_API_URL || 'https://karensrealestate-api.boy-grabacio.workers.dev').replace(/\/$/, '');
const liveBase = (process.env.LIVE_URL || process.env.SITE_URL || 'https://www.karensrealestate.nl').replace(/\/$/, '');
const get = async (url, json) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'Cache-Control': 'no-cache' } });
    return res.ok ? (json ? res.json() : res.text()) : null;
  } catch { return null; }
};

const body = await get(`${api}/v1/listings`, true);
if (!body?.version) { console.log('Listings-API niet bereikbaar: niets te doen.'); process.exit(0); }
const current = `api ${body.version}`;
const live = ((await get(`${liveBase}/aanbod-versie.txt`, false)) ?? '').trim();

const changed = current !== live;
console.log(`API:  ${current}\nLive: ${live || '(onbekend)'}\n→ ${changed ? 'gewijzigd, opnieuw bouwen' : 'ongewijzigd, niets te doen'}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
