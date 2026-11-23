/**
 * Everything a listing card shows, as plain strings. Used by ListingCard.astro (static HTML
 * at build time) and by src/scripts/listings-live.ts (live data in the browser), so both
 * render exactly the same card. No DOM, no Node APIs.
 */
import type { Listing } from '../content/listings.ts';

export interface CardStrings {
  locale: string;
  cityEn: boolean;
  status: Record<string, string>;
  available: Record<string, string>;
  pm: string;
  bed: string;
  studio: string;
  onRequest: string;
  mapOf: string;
}

export const osmEmbed = (lat: number, lon: number, dx = 0.006, dy = 0.0035) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - dx}%2C${lat - dy}%2C${lon + dx}%2C${lat + dy}&layer=mapnik&marker=${lat}%2C${lon}`;

/** Google Maps link with a pin on the (street) address. */
export const googleMapsUrl = (l: Pick<Listing, 'address' | 'city' | 'postalCode'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.address, l.postalCode, l.city].filter(Boolean).join(', '))}`;

/** Pararius Office CDN resize (Fastly Image Optimizer; parameters in alphabetical order, as the API docs ask). */
export const photoSrc = (url: string, width: number) => `${url}?fit=crop&height=${Math.round((width * 3) / 4)}&width=${width}`;
export const PHOTO_WIDTHS = [480, 720, 960];
export const photoSrcset = (url: string) => PHOTO_WIDTHS.map((w) => `${photoSrc(url, w)} ${w}w`).join(', ');

export function cardView(l: Listing, s: CardStrings) {
  const nf = new Intl.NumberFormat(s.locale);
  const city = s.cityEn && l.city === 'Den Haag' ? 'The Hague' : l.city;
  const avail = l.status === 'rented' ? s.available.rented
    : l.available === 'now' ? s.available.now
    : l.available === 'option' ? s.available.option
    : l.available === 'consult' ? s.available.consult
    : /^\d{4}-\d{2}-\d{2}$/.test(l.available)
      ? `${s.available.from} ${new Date(l.available + 'T12:00:00Z').toLocaleDateString(s.locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
      : '';
  const rooms = l.bedrooms > 0 ? `${l.bedrooms} ${s.bed}` : s.studio;
  return {
    id: `listing-${l.id}`,
    city,
    title: l.address,
    loc: `${l.postalCode ? `${l.postalCode} ${city}` : city} · ${l.neighbourhood}`,
    price: l.rent ? `€ ${nf.format(l.rent)}` : s.onRequest,
    perMonth: l.rent ? s.pm : '',
    meta: [l.area ? `${l.area} m²` : '', rooms].filter(Boolean).join(' · '),
    status: s.status[l.status] ?? '',
    avail,
    mapSrc: l.lat && l.lon ? osmEmbed(l.lat, l.lon) : null,
    mapTitle: `${s.mapOf} ${l.address}`,
    mapsUrl: googleMapsUrl(l),
    alt: `${l.address}, ${l.neighbourhood}`,
  };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Does a listing belong to an area? By city, or (in Den Haag) by wijk name. */
export function matchListing(match: { wijken: readonly string[]; cities: readonly string[] }, l: Pick<Listing, 'neighbourhood' | 'city'>): boolean {
  const wijk = norm(l.neighbourhood ?? ''), city = norm(l.city ?? '');
  if (match.cities.some((c) => city === c)) return true;
  const inDenHaag = city === 'den haag' || city === "'s-gravenhage";
  return inDenHaag && match.wijken.some((w) => new RegExp(`\\b${w}`).test(wijk));
}
