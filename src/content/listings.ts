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
  { id: 'demo-1', address: 'Frederik Hendriklaan 120', neighbourhood: 'Statenkwartier', city: 'Den Haag', rent: 1950, area: 78, bedrooms: 2, status: 'avail', available: 'now', lat: 52.0937, lon: 4.2846 },
  { id: 'demo-2', address: 'Prinsessegracht 18', neighbourhood: 'Centrum', city: 'Den Haag', rent: 2450, area: 96, bedrooms: 2, status: 'avail', available: '2027-01-01', lat: 52.0838, lon: 4.3155 },
  { id: 'demo-3', address: 'Weimarstraat 210', neighbourhood: 'Regentessekwartier', city: 'Den Haag', rent: 1475, area: 62, bedrooms: 1, status: 'new', available: 'now', lat: 52.0718, lon: 4.288 },
  { id: 'demo-4', address: 'Gevers Deynootweg 50', neighbourhood: 'Scheveningen', city: 'Den Haag', rent: 2100, area: 85, bedrooms: 2, status: 'avail', available: '2027-02-01', lat: 52.1105, lon: 4.2775 },
  { id: 'demo-5', address: 'Laan van Meerdervoort 412', neighbourhood: 'Duinoord', city: 'Den Haag', rent: 1725, area: 70, bedrooms: 2, status: 'option', available: 'option', lat: 52.0795, lon: 4.2905 },
  { id: 'demo-6', address: 'Van Boetzelaerlaan 88', neighbourhood: 'Statenkwartier', city: 'Den Haag', rent: 2800, area: 120, bedrooms: 3, status: 'avail', available: '2027-03-01', lat: 52.0905, lon: 4.2905 },
];

/** Concept presentation build (KRE_CONCEPT=1): sample content, concept label, forms send nothing. */
export const CONCEPT = process.env.KRE_CONCEPT === '1';
export const DEMO = process.env.KRE_DEMO_CONTENT === '1' || CONCEPT;

export function getListings(): Listing[] {
  return DEMO ? DEMO_LISTINGS : LISTINGS;
}
