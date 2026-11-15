/**
 * Rental listings.
 *
 * The design note specifies that listings come from the Pararius Office export
 * (XML feed / API). The feed format and credentials still have to be supplied
 * by the client, so no format is assumed here: implement `loadFromFeed()` once
 * access is available and rebuild the site whenever the feed changes
 * (see README → "Woningaanbod koppelen").
 *
 * Until then, listings can be maintained by hand in `LISTINGS` below.
 * The site never shows fictional listings in production: the sample data is
 * only used when building with KRE_DEMO_CONTENT=1 (marked as demo + noindex).
 */
import { geocode } from './geocode.ts';

export type ListingStatus = 'avail' | 'new' | 'option';

export interface Listing {
  id: string;
  address: string;
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
  /** Local photo file name in src/assets/listings/ (optional). */
  photo?: string;
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

/**
 * All listings for this build, with exact coordinates and postcode looked up
 * from the address (src/content/geocode.ts) where they are not set by hand.
 * Every listing with a known position gets a map with a pin.
 */
export async function getListings(): Promise<Listing[]> {
  const out: Listing[] = [];
  for (const l of DEMO ? DEMO_LISTINGS : LISTINGS) {
    // One at a time: kind to the PDOK service and to the shared cache file.
    const geo = l.lat && l.lon && l.postalCode ? null : await geocode(l.address, l.city, l.postalCode);
    out.push(geo ? { ...l, lat: l.lat ?? geo.lat, lon: l.lon ?? geo.lon, postalCode: l.postalCode ?? geo.postalCode } : l);
  }
  return out;
}

/** Google Maps link that drops a pin on the exact address. */
export const googleMapsUrl = (l: Pick<Listing, 'address' | 'city' | 'postalCode'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.address, l.postalCode, l.city].filter(Boolean).join(', '))}`;
