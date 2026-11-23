/**
 * Pararius Office → public listing.
 *
 * The Pararius Office API (GET /api/properties, docs: https://crm.parariusoffice.nl/external-api/docs)
 * returns far more than a website may show: exact house numbers, cadastral data, WOZ value,
 * reservation prices, tenant requirements … This module is the single whitelist: only the
 * fields below ever leave the worker. Everything is type-checked and length-limited, so a
 * strange value upstream can never end up in the page as markup or as an unexpected URL.
 */

export const PARARIUS_URL = 'https://crm.parariusoffice.nl/api/properties';

/** Only photos from the Pararius Office CDN are passed on. */
const PHOTO_HOSTS = new Set(['pararius-office-prod.global.ssl.fastly.net']);

export type PublicStatus = 'avail' | 'new' | 'option' | 'rented';

export interface PublicListing {
  id: string;
  type: string;
  /** Street (and house number only when EXACT_ADDRESS=1). */
  address: string;
  /** Full postcode with EXACT_ADDRESS=1, otherwise only the 4 digits. */
  postalCode: string;
  city: string;
  /** Wijk (CBS district), used for the filter and the area pages. */
  neighbourhood: string;
  lat: number | null;
  lon: number | null;
  /** Euros per month; null = price on request. */
  rent: number | null;
  area: number | null;
  bedrooms: number;
  interior: 'furnished' | 'upholstered' | 'shell' | null;
  status: PublicStatus;
  /** 'now' | 'consult' | 'option' | 'YYYY-MM-DD' */
  available: string;
  photo: string | null;
  publishedAt: string | null;
}

export interface MapOptions {
  exactAddress: boolean;
  types: Set<string>;
  now: Date;
}

// ---------- small safe readers ----------
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown, max = 120): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';
/** Integer from a number or a numeric string (the API sends amounts as strings, e.g. "76400"). */
const int = (v: unknown, min = 0, max = 10_000_000): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
};
const coord = (v: unknown, lo: number, hi: number, decimals: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Number(v.toFixed(decimals)) : null;
const isoDate = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const UUIDISH = /^[A-Za-z0-9-]{8,64}$/;

function photoUrl(listing: Obj): string | null {
  const photos = obj(obj(listing.media).photos);
  const medias = obj(photos.medias);
  const main = obj(medias[str(photos.main_media_id, 64)]);
  const first = Object.values(medias).map(obj).sort((a, b) => (int(a.position) ?? 1e9) - (int(b.position) ?? 1e9))[0];
  const raw = str(obj((Object.keys(main).length ? main : first ?? {}).file).url, 500);
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || !PHOTO_HOSTS.has(u.hostname)) return null;
    return `${u.origin}${u.pathname}`; // query is added by the site (size/crop)
  } catch {
    return null;
  }
}

function monthly(price: number | null, period: string): number | null {
  if (price === null || price <= 0) return null;
  const euros = price / 100; // the API returns amounts in cents
  const m = period === 'yearly' ? euros / 12 : period === 'weekly' ? (euros * 52) / 12 : euros;
  return Math.round(m);
}

/** One Pararius Office property → public listing, or null when it should not be shown. */
export function toPublic(item: unknown, o: MapOptions): PublicListing | null {
  const it = obj(item);
  const id = str(it.id, 64);
  const type = str(it.property_type, 40);
  if (!UUIDISH.test(id) || !o.types.has(type)) return null;

  const property = obj(it.property);
  const listing = obj(it.listing);
  const rent = obj(listing.rent);
  // Sale-only objects (no rent terms at all) are not part of this rental website.
  if (!Object.keys(rent).length) return null;

  const address = obj(property.address);
  const comps = obj(address.components);
  const street = str(address.street, 80);
  const city = str(address.city, 60);
  if (!street || !city) return null;
  const hn = obj(address.house_number);
  const number = [int(hn.number, 0, 100000) ?? '', str(hn.character, 4), str(hn.addition, 10) && `-${str(hn.addition, 10)}`].join('');
  const pc = str(address.postal_code, 8).replace(/\s/g, '').toUpperCase();
  const coords = obj(address.coordinates);
  const decimals = o.exactAddress ? 5 : 3; // 3 decimals ≈ 100 m: shows the street, not the front door

  const contract = obj(rent.contract);
  const avail = obj(contract.availability);
  const label = str(listing.label, 40);
  const availStatus = str(avail.status, 40);
  const publishedAt = str(listing.published_at, 30) || null;

  let status: PublicStatus;
  if (rent.available !== true || label === 'rented' || label === 'hired' || availStatus === 'rented') status = 'rented';
  else if (availStatus === 'under option' || availStatus === 'rented under reservation') status = 'option';
  else if (label === 'new' || (publishedAt && o.now.getTime() - Date.parse(publishedAt.replace(' ', 'T') + 'Z') < 7 * 864e5)) status = 'new';
  else status = 'avail';

  let available = 'now';
  const availType = str(avail.type, 40);
  const from = isoDate(avail.available_from);
  if (status === 'option') available = 'option';
  else if (availType === 'in consultation') available = 'consult';
  else if (availType === 'per date' && from && from > o.now.toISOString().slice(0, 10)) available = from;

  const spec = obj(obj(rent.price_specification).data);
  const priceOnRequest = rent.price_on_request === true || spec.price_on_request === true;
  const price = int(rent.price, 0, 100_000_000) ?? int(spec.price, 0, 100_000_000);
  const interiorType = str(obj(rent.interior).type, 20);

  return {
    id,
    type,
    address: o.exactAddress && number ? `${street} ${number}` : street,
    postalCode: o.exactAddress ? pc : pc.slice(0, 4),
    city,
    neighbourhood: str(comps.district, 60) || str(comps.neighbourhood, 60) || city,
    lat: coord(coords.latitude, 50, 54, decimals),
    lon: coord(coords.longitude, 3, 8, decimals),
    rent: priceOnRequest ? null : monthly(price, str(rent.period, 10)),
    area: int(obj(property.measurements).surface_area_livable, 1, 100_000),
    bedrooms: Array.isArray(property.bedrooms) ? Math.min(property.bedrooms.length, 50) : 0,
    interior: interiorType === 'furnished' || interiorType === 'upholstered' || interiorType === 'shell' ? interiorType : null,
    status,
    available,
    photo: photoUrl(listing),
    publishedAt,
  };
}

const ORDER: Record<PublicStatus, number> = { new: 0, avail: 1, option: 2, rented: 3 };

/** Whole API response → sorted public list (available first, newest first). */
export function mapResponse(body: unknown, o: MapOptions): PublicListing[] {
  const props = obj(obj(body).result).properties;
  if (!Array.isArray(props)) throw new Error('Onverwacht antwoord van Pararius Office (geen result.properties)');
  return props
    .slice(0, 500)
    .map((p) => toPublic(p, o))
    .filter((l): l is PublicListing => l !== null)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}
