import { XMLParser } from 'fast-xml-parser';
import type { Listing, ListingStatus } from '../listings.ts';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Pararius Office → woningaanbod op de website
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs at BUILD time only (the token never reaches the browser). When
 * PARARIUS_OFFICE_TOKEN is set, getListings() uses this feed instead of the
 * hand-maintained list; the GitHub Action "Woningaanbod bijwerken" rebuilds
 * the site automatically when the offer changes.
 *
 * Pararius Office does not publish its API specification; it is supplied
 * together with the token ("koppeling eigen website"). Everything that may
 * have to change once we have that spec is in the CONFIG block below:
 *   1. CONFIG.url       – the endpoint (or set PARARIUS_OFFICE_URL)
 *   2. CONFIG.auth      – how the token is sent (or set PARARIUS_OFFICE_AUTH)
 *   3. FIELDS           – where each value lives in one feed item
 *   4. STATUS           – which status values mean available / option / rented
 * JSON and XML are both understood, and the list of items is found
 * automatically. Test the mapping without a token:
 *   npm run feed:test                      (uses tests/fixtures/pararius-office.sample.json)
 *   npm run feed:test -- path/or/url       (any real export)
 */

// ─── 1 + 2. Endpoint and authentication ─────────────────────────────────────
const env = (k: string) => (process.env[k] ?? '').trim();

export const CONFIG = {
  token: env('PARARIUS_OFFICE_TOKEN'),
  /** Endpoint that returns the office's listings. Also accepts file:// for local tests. */
  url: env('PARARIUS_OFFICE_URL'),
  /**
   * How the token is sent:
   *   bearer            → Authorization: Bearer <token>      (default)
   *   header:<Name>     → <Name>: <token>                   e.g. header:X-Api-Key
   *   query:<param>     → ?<param>=<token>                  e.g. query:token
   */
  auth: env('PARARIUS_OFFICE_AUTH') || 'bearer',
  /** Max. pages to follow when the API paginates (next-links). */
  maxPages: 20,
};

export const isConfigured = () => Boolean(CONFIG.token || CONFIG.url.startsWith('file:'));

// ─── 3. Field mapping ───────────────────────────────────────────────────────
// For every field, the paths are tried in order; the first non-empty value wins.
// Paths use dots for nesting ("address.street") and [0] for the first array item.
// Common Dutch/English names are already included; add the exact names from the spec.
const FIELDS = {
  id: ['id', 'uuid', 'objectId', 'object_id', 'reference', 'referentie', 'externalId'],
  street: ['street', 'straat', 'streetName', 'straatnaam', 'address.street', 'adres.straat', 'location.street'],
  houseNumber: ['houseNumber', 'huisnummer', 'number', 'address.houseNumber', 'address.number', 'adres.huisnummer', 'location.houseNumber'],
  houseNumberAddition: ['houseNumberAddition', 'huisnummertoevoeging', 'toevoeging', 'addition', 'address.houseNumberAddition', 'address.addition', 'adres.toevoeging'],
  /** Used only when street/houseNumber are missing. */
  fullAddress: ['address', 'adres', 'fullAddress', 'title', 'titel'],
  postalCode: ['postalCode', 'postcode', 'zipcode', 'zipCode', 'zip', 'address.postalCode', 'address.zipcode', 'adres.postcode', 'location.postalCode'],
  city: ['city', 'plaats', 'woonplaats', 'place', 'address.city', 'adres.plaats', 'location.city'],
  neighbourhood: ['neighbourhood', 'neighborhood', 'district', 'wijk', 'buurt', 'address.district', 'location.district'],
  rent: ['rentPrice', 'rent', 'huurprijs', 'price', 'prijs', 'price.amount', 'rent.amount', 'financial.rentPrice', 'prices.rent'],
  area: ['livingArea', 'woonoppervlakte', 'surface', 'area', 'oppervlakte', 'size', 'dimensions.livingArea'],
  bedrooms: ['bedrooms', 'slaapkamers', 'numberOfBedrooms', 'aantalSlaapkamers', 'rooms.bedrooms'],
  status: ['status', 'state', 'availabilityStatus', 'beschikbaarheid'],
  availableFrom: ['availableFrom', 'beschikbaarPer', 'beschikbaarVanaf', 'acceptance', 'aanvaarding', 'availability.from', 'startDate'],
  interior: ['interior', 'interieur', 'furnishing', 'oplevering'],
  publishedAt: ['publishedAt', 'published', 'gepubliceerd', 'createdAt', 'dateCreated', 'listedSince'],
  photos: ['photos', 'images', 'media', 'fotos', "foto's", 'pictures'],
  /** Within one photo item: where the URL is. */
  photoUrl: ['url', 'src', 'href', 'original', 'large', 'link'],
  url: ['url', 'link', 'parariusUrl', 'publicUrl', 'detailUrl', 'pararius.url'],
  description: ['description', 'omschrijving', 'beschrijving', 'text'],
  lat: ['latitude', 'lat', 'location.latitude', 'address.latitude', 'geo.lat'],
  lon: ['longitude', 'lon', 'lng', 'location.longitude', 'address.longitude', 'geo.lon', 'geo.lng'],
};

// ─── 4. Status mapping (lower-case, compared by "contains") ─────────────────
const STATUS: { hide: string[]; option: string[] } = {
  /** Not shown on the site. */
  hide: ['verhuurd', 'rented', 'let agreed', 'ingetrokken', 'withdrawn', 'archived', 'gearchiveerd', 'inactive', 'concept', 'draft', 'verkocht', 'sold'],
  /** Shown with the label "Onder optie". */
  option: ['optie', 'option', 'onder voorbehoud', 'reserved', 'gereserveerd'],
};
/** Listings published less than this many days ago get the label "Nieuw". */
const NEW_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Implementation (normally no changes needed below this line)
// ─────────────────────────────────────────────────────────────────────────────

type Raw = Record<string, unknown>;

function at(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    const m = /^(.+?)\[(\d+)\]$/.exec(part);
    cur = m ? (cur as Raw)[m[1]] : (cur as Raw)[part];
    if (m) cur = Array.isArray(cur) ? cur[Number(m[2])] : undefined;
    // XML text nodes: { "#text": "…", "@_attr": … }
    if (cur && typeof cur === 'object' && !Array.isArray(cur) && '#text' in (cur as Raw)) cur = (cur as Raw)['#text'];
  }
  return cur;
}

function pick(obj: unknown, paths: readonly string[]): unknown {
  for (const p of paths) {
    const v = at(obj, p);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const str = (v: unknown) => (v === undefined || v === null ? '' : typeof v === 'object' ? '' : String(v).trim());
function num(v: unknown): number {
  if (typeof v === 'number') return v;
  // "€ 1.950,-" / "1950.00" / "78 m²"
  const s = str(v).replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  const normal = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[,]/g, '').replace(/\.(?=\d{3}\b)/g, '');
  return Number.parseFloat(normal);
}

function toDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const nl = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s); // 01-02-2027
  const d = nl ? new Date(Date.UTC(+nl[3], +nl[2] - 1, +nl[1])) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function photoUrls(raw: Raw): string[] {
  let list = pick(raw, FIELDS.photos);
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    // XML: <photos><photo>…</photo><photo>…</photo></photos>
    const inner = Object.values(list as Raw).find((v) => Array.isArray(v) || typeof v === 'object' || typeof v === 'string');
    list = Array.isArray(inner) ? inner : [inner];
  }
  if (!Array.isArray(list)) list = list ? [list] : [];
  return (list as unknown[])
    .map((p) => (typeof p === 'string' ? p : str(pick(p, FIELDS.photoUrl))))
    .filter((u) => /^https:\/\//i.test(u));
}

/** Converts one feed item into a Listing; returns null for items that must not be shown. */
export function mapItem(raw: Raw, now = new Date()): Listing | null {
  const statusText = str(pick(raw, FIELDS.status)).toLowerCase();
  if (STATUS.hide.some((s) => statusText.includes(s))) return null;

  const street = str(pick(raw, FIELDS.street));
  const nr = [str(pick(raw, FIELDS.houseNumber)), str(pick(raw, FIELDS.houseNumberAddition))].filter(Boolean).join(' ');
  const address = street ? `${street}${nr ? ' ' + nr : ''}` : str(pick(raw, FIELDS.fullAddress));
  const cityRaw = str(pick(raw, FIELDS.city));
  const city = /^'?s-?gravenhage$/i.test(cityRaw) ? 'Den Haag' : cityRaw;
  const rent = num(pick(raw, FIELDS.rent));
  if (!address || !city || !Number.isFinite(rent)) return null; // not enough to show

  const published = toDate(pick(raw, FIELDS.publishedAt));
  const isNew = published ? (now.getTime() - Date.parse(published)) / 86_400_000 < NEW_DAYS : false;
  const status: ListingStatus = STATUS.option.some((s) => statusText.includes(s)) ? 'option' : isNew ? 'new' : 'avail';
  const from = toDate(pick(raw, FIELDS.availableFrom));
  const available = status === 'option' ? 'option' : from && from > now.toISOString().slice(0, 10) ? from : 'now';
  const lat = num(pick(raw, FIELDS.lat)), lon = num(pick(raw, FIELDS.lon));
  const url = str(pick(raw, FIELDS.url));
  const photos = photoUrls(raw);
  const id = str(pick(raw, FIELDS.id)) || `${address}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: id.replace(/[^A-Za-z0-9_-]+/g, '-'),
    address,
    city,
    neighbourhood: str(pick(raw, FIELDS.neighbourhood)),
    ...(str(pick(raw, FIELDS.postalCode)) ? { postalCode: str(pick(raw, FIELDS.postalCode)).toUpperCase().replace(/^(\d{4})\s*([A-Z]{2})$/, '$1 $2') } : {}),
    rent: Math.round(rent),
    area: Math.round(num(pick(raw, FIELDS.area)) || 0),
    bedrooms: Math.round(num(pick(raw, FIELDS.bedrooms)) || 0),
    status,
    available,
    ...(Number.isFinite(lat) && Number.isFinite(lon) && lat > 50 && lat < 54 && lon > 3 && lon < 8 ? { lat, lon } : {}),
    ...(photos.length ? { photoUrl: photos[0] } : {}),
    ...(/^https:\/\//i.test(url) ? { url } : {}),
  };
}

/** An object that has an address or a rent is treated as a listing (and not, say, a photo). */
const looksLikeListing = (x: unknown) =>
  !!x && typeof x === 'object' && !Array.isArray(x) && (pick(x, FIELDS.street) !== undefined || pick(x, FIELDS.fullAddress) !== undefined || pick(x, FIELDS.rent) !== undefined);

/** Finds the array of listing items anywhere in a parsed response (breadth-first, common wrapper keys first). */
export function findItems(data: unknown, depth = 0): Raw[] {
  if (depth > 6 || !data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.some(looksLikeListing) ? (data.filter(looksLikeListing) as Raw[]) : [];
  const obj = data as Raw;
  const preferred = ['data', 'items', 'results', 'properties', 'objects', 'listings', 'woningen', 'aanbod', 'object', 'property', 'woning', 'listing', 'item'];
  const keys = [...preferred.filter((k) => k in obj), ...Object.keys(obj).filter((k) => !preferred.includes(k))];
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.some(looksLikeListing)) return v.filter(looksLikeListing) as Raw[];
  }
  for (const k of keys) { const r = findItems(obj[k], depth + 1); if (r.length) return r; }
  // A response that is itself one listing.
  return depth === 0 && looksLikeListing(obj) ? [obj] : [];
}

const nextLink = (data: unknown): string => str(pick(data, ['links.next', 'next', 'next_page_url', 'meta.next', 'pagination.next', '_links.next.href']));

function parse(raw: string, contentType: string): unknown {
  const body = raw.replace(/^﻿/, ''); // byte order mark, common in Windows/XML exports
  const t = body.trimStart();
  if (contentType.includes('xml') || t.startsWith('<')) {
    return new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true, isArray: (name) => /^(object|property|woning|item|listing|photo|foto|image)$/i.test(name) }).parse(body);
  }
  return JSON.parse(body);
}

async function request(url: string): Promise<{ data: unknown }> {
  if (url.startsWith('file:')) {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const p = fileURLToPath(url);
    return { data: parse(await readFile(p, 'utf8'), p.endsWith('.xml') ? 'xml' : 'json') };
  }
  const u = new URL(url);
  const headers: Record<string, string> = { Accept: 'application/json, application/xml;q=0.9', 'User-Agent': 'KarensRealEstate-Website/1.0' };
  const [kind, name] = CONFIG.auth.split(':');
  if (kind === 'bearer') headers.Authorization = `Bearer ${CONFIG.token}`;
  else if (kind === 'header' && name) headers[name] = CONFIG.token;
  else if (kind === 'query' && name) u.searchParams.set(name, CONFIG.token);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(u, { headers, signal: AbortSignal.timeout(20_000) });
      if (res.status === 401 || res.status === 403) throw Object.assign(new Error(`Pararius Office weigert de token (HTTP ${res.status}). Controleer PARARIUS_OFFICE_TOKEN en PARARIUS_OFFICE_AUTH.`), { fatal: true });
      if (!res.ok) throw new Error(`Pararius Office antwoordde HTTP ${res.status}`);
      return { data: parse(await res.text(), res.headers.get('content-type') ?? '') };
    } catch (e) {
      lastError = e;
      if ((e as { fatal?: boolean }).fatal) break;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw lastError;
}

/** Fetches every page of the feed and returns the listings to show. Throws when the feed cannot be read. */
export async function fetchParariusOffice(): Promise<Listing[]> {
  if (!CONFIG.url) throw new Error('PARARIUS_OFFICE_URL ontbreekt: vul het endpoint uit de Pararius Office-documentatie in.');
  const items: Raw[] = [];
  let url = CONFIG.url;
  for (let page = 0; url && page < CONFIG.maxPages; page++) {
    const { data } = await request(url);
    items.push(...findItems(data));
    const next = nextLink(data);
    url = next ? new URL(next, url).href : '';
  }
  const now = new Date();
  const listings = items.map((raw) => mapItem(raw, now)).filter((l): l is Listing => l !== null);
  // Unique ids (the id is used for anchors and structured data).
  const seen = new Set<string>();
  return listings.filter((l) => !seen.has(l.id) && seen.add(l.id));
}
