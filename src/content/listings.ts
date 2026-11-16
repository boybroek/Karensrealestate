/**
 * Rental listings.
 *
 * Source, in this order:
 *   1. Demo build (KRE_DEMO_CONTENT=1): the sample listings below, marked as demo + noindex.
 *   2. Pararius Office, as soon as PARARIUS_OFFICE_TOKEN is set (see sources/pararius-office.ts).
 *      The feed is read at build time; the GitHub Action "Woningaanbod bijwerken" rebuilds
 *      and deploys the site whenever the offer changes.
 *   3. Otherwise the hand-maintained LISTINGS below (may be empty: the page then
 *      links to the office profile on Pararius).
 *
 * The site never shows fictional listings in production.
 */
import { geocode } from './geocode.ts';
import { fetchParariusOffice, isConfigured as parariusConfigured } from './sources/pararius-office.ts';

export type ListingStatus = 'avail' | 'new' | 'option';

export interface Listing {
  id: string;
  address: string;
  /** Wijk shown on the card and used for the filter. Optional: looked up from the address when empty. */
  neighbourhood: string;
  city: string;
  postalCode?: string;
  /** Rent per month in euros. */
  rent: number;
  /** Living area in m². */
  area: number;
  bedrooms: number;
  status: ListingStatus;
  /** 'now', 'option' or an ISO date (YYYY-MM-DD). */
  available: string;
  /**
   * Position for the map pin. Optional: when left out, it is looked up from the
   * address at build time (PDOK, see geocode.ts) together with the postcode.
   * Only set these to override the automatic position.
   */
  lat?: number;
  lon?: number;
  /** Main photo (https URL, e.g. from Pararius Office). Downloaded and optimised at build time. */
  photoUrl?: string;
  /** Link to the full listing (e.g. on Pararius), optional. */
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

/** Where this build's listings come from (also shown by `npm run launch-check`). */
export const listingSource = (): 'demo' | 'pararius-office' | 'handmatig' =>
  DEMO ? 'demo' : parariusConfigured() ? 'pararius-office' : 'handmatig';

async function rawListings(): Promise<Listing[]> {
  if (DEMO) return DEMO_LISTINGS;
  if (!parariusConfigured()) return LISTINGS;
  try {
    const list = await fetchParariusOffice();
    console.log(`[aanbod] ${list.length} woning(en) uit Pararius Office`);
    return list;
  } catch (e) {
    // Default: stop the build, so the live site keeps its last good offer instead of
    // suddenly showing nothing. Set PARARIUS_OFFICE_OPTIONAL=1 to build anyway.
    if (process.env.PARARIUS_OFFICE_OPTIONAL === '1') {
      console.warn(`[aanbod] Pararius Office niet bereikbaar, handmatige lijst gebruikt: ${(e as Error).message}`);
      return LISTINGS;
    }
    throw new Error(`[aanbod] Pararius Office kon niet worden gelezen: ${(e as Error).message}`);
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
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(JSON.stringify(await raw())).digest('hex').slice(0, 16);
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

/** Google Maps link that drops a pin on the exact address. */
export const googleMapsUrl = (l: Pick<Listing, 'address' | 'city' | 'postalCode'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.address, l.postalCode, l.city].filter(Boolean).join(', '))}`;
