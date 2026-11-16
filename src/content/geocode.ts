import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build-time geocoding of Dutch addresses via the PDOK Locatieserver
 * (free government service, no API key, BAG address data). Runs only during
 * `astro build` / `astro dev`, never in the visitor's browser.
 *
 * Returns the exact position, the postcode and the municipal district (wijk),
 * so a listing only needs a street address and a city.
 *
 * Results are cached in geocode-cache.json (committed), so builds are fast,
 * reproducible and still work without network access. To correct a position
 * by hand, edit the entry in the cache file or set lat/lon on the listing.
 */
export interface Geo { lat: number; lon: number; postalCode?: string; wijk?: string | null }

// Resolved from the project root: during `astro build` this module runs from a bundled chunk,
// so import.meta.url would point into the build output instead of src/content.
const CACHE_FILE = join(process.cwd(), 'src', 'content', 'geocode-cache.json');
let cache: Record<string, Geo> | null = null;

function load(): Record<string, Geo> {
  if (cache) return cache;
  try { cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {}; } catch { cache = {}; }
  return cache!;
}

const keyOf = (address: string, city: string, postalCode?: string) =>
  [address, postalCode ?? '', city].map((s) => s.trim().toLowerCase().replace(/\s+/g, ' ')).join('|');

/** "Wijk 09 Geuzen- en Statenkwartier" → "Geuzen- en Statenkwartier" */
const cleanWijk = (w: unknown) => (typeof w === 'string' && w.trim() ? w.replace(/^Wijk\s+\d+\s+/i, '').trim() : null);

/** Coordinates, postcode and wijk for an address, or null when it cannot be found. */
export async function geocode(address: string, city: string, postalCode?: string): Promise<Geo | null> {
  const c = load();
  const key = keyOf(address, city, postalCode);
  // Entries from before the wijk was stored have no "wijk" key at all: look those up again once.
  if (c[key] && 'wijk' in c[key]) return c[key];
  const q = [address, postalCode, city].filter(Boolean).join(' ');
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1&fl=centroide_ll,postcode,wijknaam`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`PDOK ${res.status}`);
    const doc = (await res.json())?.response?.docs?.[0];
    const m = /POINT\(([\d.]+) ([\d.]+)\)/.exec(doc?.centroide_ll ?? '');
    if (!m) { console.warn(`[geocode] adres niet gevonden: ${q}`); return c[key] ?? null; }
    const pc = typeof doc.postcode === 'string' ? doc.postcode.replace(/^(\d{4})([A-Z]{2})$/, '$1 $2') : undefined;
    const geo: Geo = {
      lat: Math.round(Number(m[2]) * 1e6) / 1e6,
      lon: Math.round(Number(m[1]) * 1e6) / 1e6,
      ...(pc ? { postalCode: pc } : {}),
      wijk: cleanWijk(doc.wijknaam),
    };
    c[key] = geo;
    writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2) + '\n');
    return geo;
  } catch (e) {
    console.warn(`[geocode] opzoeken mislukt voor "${q}": ${(e as Error).message}`);
    return c[key] ?? null;
  }
}
