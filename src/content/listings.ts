/**
 * Rental listings.
 *
 * Source, in this order:
 *   1. The listings API (api-worker/), as soon as LISTINGS_API_URL is set. That separate
 *      Cloudflare Worker holds the Pararius Office API key, caches the offer and serves only
 *      public fields. The build reads it for the static HTML (SEO, no-JS) and the browser
 *      reads it again on every visit (src/scripts/listings-live.ts), so the site is always
 *      current without a rebuild. The site itself never sees the Pararius key.
 *   2. Demo build without API (KRE_DEMO_CONTENT=1): the sample listings below.
 *   3. Otherwise the hand-maintained LISTINGS below (may be empty: the page then
 *      links to the office profile on Pararius).
 *
 * The site never shows fictional listings in production.
 */
import { geocode } from './geocode.ts';

export type ListingStatus = 'avail' | 'new' | 'option' | 'rented';

export interface Listing {
  id: string;
  address: string;
  /** Wijk shown on the card and used for the filter. Optional: looked up from the address when empty. */
  neighbourhood: string;
  city: string;
  postalCode?: string;
  /** Rent per month in euros; null = price on request. */
  rent: number | null;
  /** Living area in m². */
  area: number | null;
  bedrooms: number;
  status: ListingStatus;
  /** 'now', 'consult', 'option' or an ISO date (YYYY-MM-DD). */
  available: string;
  /**
   * Position for the map pin. Optional: when left out, it is looked up from the
   * address at build time (PDOK, see geocode.ts) together with the postcode.
   */
  lat?: number;
  lon?: number;
  /** Main photo (https URL on the Pararius Office CDN). Resized by the CDN (see photoSrc). */
  photoUrl?: string;
  /** Link to the full listing, optional. */
  url?: string;
}

/** Hand-maintained listings. Leave empty when there is no current offer. */
const LISTINGS: Listing[] = [];

const DEMO_LISTINGS: Listing[] = [
  { id: 'demo-1', address: 'Frederik Hendriklaan 120', neighbourhood: 'Statenkwartier', city: 'Den Haag', rent: 1950, area: 78, bedrooms: 2, status: 'avail', available: 'now' },
  { id: 'demo-2', address: 'Prinsessegracht 18', neighbourhood: 'Centrum', city: 'Den Haag', rent: 2450, area: 96, bedrooms: 2, status: 'avail', available: '2027-01-01' },
  { id: 'demo-3', address: 'Weimarstraat 210', neighbourhood: 'Regentessekwartier', city: 'Den Haag', rent: 1475, area: 62, bedrooms: 1, status: 'new', available: 'now' },
  { id: 'demo-4', address: 'Gevers Deynootweg 50', neighbourhood: 'Scheveningen', city: 'Den Haag', rent: 2100, area: 85, bedrooms: 2, status: 'avail', available: '2027-02-01' },
  { id: 'demo-5', address: 'Laan van Meerdervoort 412', neighbourhood: 'Duinoord', city: 'Den Haag', rent: 1725, area: 70, bedrooms: 2, status: 'option', available: 'option' },
  { id: 'demo-6', address: 'Van Boetzelaerlaan 88', neighbourhood: 'Statenkwartier', city: 'Den Haag', rent: 2800, area: 120, bedrooms: 3, status: 'avail', available: '2027-03-01' },
];

/** Concept presentation build (KRE_CONCEPT=1): sample content, concept label, forms send nothing. */
export const CONCEPT = process.env.KRE_CONCEPT === '1';
export const DEMO = process.env.KRE_DEMO_CONTENT === '1' || CONCEPT;

/** Base URL of the listings API worker (no trailing slash), or '' when not used. */
export const LISTINGS_API = CONCEPT ? '' : (process.env.LISTINGS_API_URL ?? '').trim().replace(/\/+$/, '');

/** Where this build's listings come from (also shown by `npm run launch-check`). */
export const listingSource = (): 'api' | 'demo' | 'handmatig' =>
  LISTINGS_API ? 'api' : DEMO ? 'demo' : 'handmatig';

interface ApiListing {
  id: string; address: string; postalCode: string; city: string; neighbourhood: string;
  lat: number | null; lon: number | null; rent: number | null; area: number | null; bedrooms: number;
  status: ListingStatus; available: string; photo: string | null;
}

/** API listing → site listing (same shape the browser script uses). */
export const fromApi = (l: ApiListing): Listing => ({
  id: l.id, address: l.address, postalCode: l.postalCode || undefined, city: l.city, neighbourhood: l.neighbourhood,
  lat: l.lat ?? undefined, lon: l.lon ?? undefined, rent: l.rent, area: l.area, bedrooms: l.bedrooms,
  status: l.status, available: l.available, photoUrl: l.photo ?? undefined,
});

let apiVersion = '';

async function fromListingsApi(): Promise<Listing[]> {
  const res = await fetch(`${LISTINGS_API}/v1/listings`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`listings API HTTP ${res.status}`);
  const body = await res.json() as { version: string; listings: ApiListing[] };
  apiVersion = body.version;
  return body.listings.map(fromApi);
}

async function rawListings(): Promise<Listing[]> {
  if (!LISTINGS_API) return DEMO ? DEMO_LISTINGS : LISTINGS;
  try {
    const list = await fromListingsApi();
    console.log(`[aanbod] ${list.length} woning(en) uit de listings-API (${LISTINGS_API})`);
    return list;
  } catch (e) {
    // Default: stop the build, so a deploy never replaces a good offer with an empty page.
    // Set LISTINGS_API_OPTIONAL=1 to build anyway (the browser still loads the live offer).
    if (process.env.LISTINGS_API_OPTIONAL === '1') {
      console.warn(`[aanbod] listings-API niet bereikbaar, lege lijst gebruikt: ${(e as Error).message}`);
      return [];
    }
    throw new Error(`[aanbod] listings-API kon niet worden gelezen (${LISTINGS_API}): ${(e as Error).message}`);
  }
}

let rawCached: Promise<Listing[]> | null = null;
const raw = () => (rawCached ??= rawListings());

/**
 * Short hash of the current offer as the source delivers it. Published at
 * /aanbod-versie.txt; the GitHub Action compares it with the live site and only
 * rebuilds when something changed (new listing, price, status, photo …).
 */
export async function listingsFingerprint(): Promise<string> {
  const list = await raw();
  if (apiVersion) return apiVersion;
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0, 16);
}

async function enrich(): Promise<Listing[]> {
  const out: Listing[] = [];
  for (const l of await raw()) {
    // One at a time: kind to the PDOK service and to the shared cache file.
    const complete = l.lat && l.lon && l.postalCode && l.neighbourhood;
    const geo = complete ? null : await geocode(l.address, l.city, l.postalCode);
    out.push(geo ? {
      ...l,
      lat: l.lat ?? geo.lat,
      lon: l.lon ?? geo.lon,
      postalCode: l.postalCode ?? geo.postalCode,
      neighbourhood: l.neighbourhood || geo.wijk || l.city,
    } : { ...l, neighbourhood: l.neighbourhood || l.city });
  }
  return out;
}

let cached: Promise<Listing[]> | null = null;

/**
 * All listings for this build, with exact coordinates, postcode and wijk looked up
 * from the address where they are not set. Fetched once per build, however many
 * pages use them. Every listing with a known position gets a map with a pin.
 */
export function getListings(): Promise<Listing[]> {
  return (cached ??= enrich());
}

export { googleMapsUrl } from '../lib/listing-view.ts';
