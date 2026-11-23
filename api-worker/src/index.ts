/**
 * Karens Real Estate – listings API (separate Cloudflare Worker).
 *
 * Holds the Pararius Office API key (secret PARARIUS_OFFICE_TOKEN) and is the only thing
 * that ever talks to Pararius Office. The website (and its visitors' browsers) only ever
 * talk to this worker.
 *
 *   GET /v1/listings   public, cached list of the current offer (whitelisted fields only)
 *   GET /v1/health     status: number of listings, version, age of the data
 *
 * Why this cannot be abused:
 *   - Visitors never reach Pararius: the cron (every 5 min) refreshes the data in KV;
 *     public requests are served from the edge cache / KV. Pararius allows 1 call per
 *     60 s, and however much traffic arrives, we stay well within that.
 *     Only an empty KV (first start) triggers an inline refresh, behind a 60 s lock.
 *   - No input is used: query strings, headers and bodies are ignored, nothing is
 *     reflected, and only GET/HEAD/OPTIONS on two fixed paths exist.
 *   - The output is a whitelist (see pararius.ts): no house numbers by default, no
 *     cadastral/WOZ/tenant data, photo URLs only from the Pararius CDN.
 *   - CORS only for the site's own origins; browsers on other sites get a 403.
 *   - Per-IP rate limit (Workers Rate Limiting binding) as a last line against floods.
 *   - Strict response headers (nosniff, CSP default-src 'none', no framing).
 */
import { mapResponse, PARARIUS_URL, type PublicListing } from './pararius.ts';

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
interface RateLimiter { limit(o: { key: string }): Promise<{ success: boolean }> }
interface Env {
  LISTINGS_KV: KV;
  RATE_LIMITER?: RateLimiter;
  PARARIUS_OFFICE_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  EXACT_ADDRESS?: string;
  INCLUDE_TYPES?: string;
}
interface Ctx { waitUntil(p: Promise<unknown>): void }
declare const caches: { default: { match(r: Request): Promise<Response | undefined>; put(r: Request, res: Response): Promise<void> } };

interface Snapshot { version: string; generatedAt: string; listings: PublicListing[] }

const KEY = 'listings:v1';
const LOCK = 'refresh-lock';
const BROWSER_MAX_AGE = 60;

// ---------- responses ----------
const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Robots-Tag': 'noindex',
};

function corsHeaders(origin: string | null): Record<string, string> {
  return origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : { Vary: 'Origin' };
}

function reply(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(status === 204 || status === 304 ? null : JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store', ...corsHeaders(origin), ...extra },
  });
}

function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean));
}

// ---------- data ----------
async function sha16(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function readSnapshot(env: Env): Promise<Snapshot | null> {
  const raw = await env.LISTINGS_KV.get(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Snapshot; } catch { return null; }
}

/** Fetch Pararius Office and store the public snapshot. Never throws. */
async function refresh(env: Env): Promise<{ ok: boolean; changed?: boolean; count?: number; reason?: string }> {
  const token = (env.PARARIUS_OFFICE_TOKEN ?? '').trim();
  if (!token) return { ok: false, reason: 'PARARIUS_OFFICE_TOKEN ontbreekt' };
  try {
    const res = await fetch(PARARIUS_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': 'karensrealestate-listings-api' },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429) return { ok: false, reason: `rate limited, retry na ${res.headers.get('Retry-After') ?? '?'} s` };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: `Pararius Office weigert de API-key (${res.status})` };
    if (!res.ok) return { ok: false, reason: `Pararius Office HTTP ${res.status}` };
    const listings = mapResponse(await res.json(), {
      exactAddress: env.EXACT_ADDRESS === '1',
      types: new Set((env.INCLUDE_TYPES || 'apartment,house,room').split(',').map((s) => s.trim())),
      now: new Date(),
    });
    const version = await sha16(JSON.stringify(listings));
    const old = await readSnapshot(env);
    if (old?.version === version) return { ok: true, changed: false, count: listings.length };
    const snap: Snapshot = { version, generatedAt: new Date().toISOString(), listings };
    await env.LISTINGS_KV.put(KEY, JSON.stringify(snap));
    return { ok: true, changed: true, count: listings.length };
  } catch (e) {
    return { ok: false, reason: (e as Error).message.slice(0, 200) };
  }
}

/** Snapshot from KV; on a cold start one guarded inline refresh (max 1 per 60 s). */
async function getSnapshot(env: Env): Promise<Snapshot | null> {
  const snap = await readSnapshot(env);
  if (snap) return snap;
  if (await env.LISTINGS_KV.get(LOCK)) return null;
  await env.LISTINGS_KV.put(LOCK, '1', { expirationTtl: 60 });
  const r = await refresh(env);
  console.log(JSON.stringify({ msg: 'cold refresh', ...r }));
  return readSnapshot(env);
}

// ---------- handlers ----------
async function listings(req: Request, env: Env, ctx: Ctx, origin: string | null): Promise<Response> {
  const cacheKey = new Request(new URL('/v1/listings', req.url).href, { method: 'GET' });
  let body: string | undefined;
  let etag: string | undefined;

  const hit = await caches.default.match(cacheKey);
  if (hit) {
    body = await hit.text();
    etag = hit.headers.get('ETag') ?? undefined;
  } else {
    const snap = await getSnapshot(env);
    if (!snap) return reply(503, { error: 'Aanbod tijdelijk niet beschikbaar' }, origin, { 'Retry-After': '60' });
    body = JSON.stringify({ version: snap.version, generatedAt: snap.generatedAt, count: snap.listings.length, listings: snap.listings });
    etag = `"${snap.version}"`;
    ctx.waitUntil(caches.default.put(cacheKey, new Response(body, {
      headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': `public, max-age=${BROWSER_MAX_AGE}` },
    })));
  }

  const headers = { 'Cache-Control': `public, max-age=${BROWSER_MAX_AGE}, stale-while-revalidate=600`, ...(etag ? { ETag: etag } : {}) };
  if (etag && req.headers.get('If-None-Match') === etag) return reply(304, null, origin, headers);
  return new Response(req.method === 'HEAD' ? null : body, { status: 200, headers: { ...BASE_HEADERS, ...corsHeaders(origin), ...headers } });
}

async function health(env: Env, origin: string | null): Promise<Response> {
  const snap = await readSnapshot(env);
  const age = snap ? Math.round((Date.now() - Date.parse(snap.generatedAt)) / 1000) : null;
  return reply(snap ? 200 : 503, {
    ok: !!snap,
    configured: !!(env.PARARIUS_OFFICE_TOKEN ?? '').trim(),
    count: snap?.listings.length ?? 0,
    version: snap?.version ?? null,
    generatedAt: snap?.generatedAt ?? null,
    ageSeconds: age,
  }, origin);
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // CORS: a browser on another site gets a clear refusal; non-browser clients (no Origin) are fine.
    const originHeader = req.headers.get('Origin');
    const origin = originHeader && allowedOrigins(env).has(originHeader) ? originHeader : null;
    if (originHeader && !origin) return reply(403, { error: 'Origin niet toegestaan' }, null);

    if (req.method === 'OPTIONS') return reply(204, null, origin, { 'Cache-Control': 'public, max-age=86400' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, { error: 'Methode niet toegestaan' }, origin, { Allow: 'GET, HEAD, OPTIONS' });
    if (path !== '/v1/listings' && path !== '/v1/health') return reply(404, { error: 'Niet gevonden' }, origin);

    if (env.RATE_LIMITER) {
      // Best effort (Cloudflare counts per location, approximately). IPv6 is keyed per /64,
      // because one connection can rotate through many addresses in its own /64.
      const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
      const key = ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return reply(429, { error: 'Te veel verzoeken' }, origin, { 'Retry-After': '60' });
    }

    return path === '/v1/listings' ? listings(req, env, ctx, origin) : health(env, origin);
  },

  async scheduled(_event: unknown, env: Env, ctx: Ctx): Promise<void> {
    ctx.waitUntil(refresh(env).then((r) => console.log(JSON.stringify({ msg: 'scheduled refresh', ...r }))));
  },
};
