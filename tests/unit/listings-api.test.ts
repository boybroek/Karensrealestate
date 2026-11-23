import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapResponse, toPublic } from '../../api-worker/src/pararius.ts';

const NOW = new Date('2026-11-23T12:00:00Z');
const OPTS = { exactAddress: false, types: new Set(['apartment', 'house', 'room']), now: NOW };
const CDN = 'https://pararius-office-prod.global.ssl.fastly.net/1/files/photos/a.jpg';

function item(over: { listing?: Record<string, unknown>; rent?: Record<string, unknown>; address?: Record<string, unknown>; type?: string } = {}) {
  return {
    id: '0e03c29f-2acc-5c93-8277-f4611899f2df',
    property_type: over.type ?? 'apartment',
    property: {
      address: {
        street: 'Teststraat', city: 'Den Haag', postal_code: '2582XZ', house_number: { number: 12, character: 'a', addition: '2' },
        components: { district: 'Geuzen- en Statenkwartier', neighbourhood: 'Geuzenkwartier' },
        coordinates: { latitude: 52.0920794, longitude: 4.2781234 }, code: 'BAG-SECRET',
        ...over.address,
      },
      measurements: { surface_area_livable: 78 },
      bedrooms: [{}, {}],
      property_valuation: { amount: 999999 },
      parcels: [{ cadastral_information: 'SECRET' }],
    },
    listing: {
      label: '', published_at: '2026-10-01 10:00:00',
      rent: {
        available: true, price: '182500', period: 'monthly', price_on_request: false, interior: { type: 'upholstered' },
        contract: { availability: { type: 'immediately', status: 'to rent', reservation: { price: 123 } } },
        tenant_requirements: { monthly_income: 6000 },
        ...over.rent,
      },
      media: { photos: { main_media_id: 'm1', medias: { m1: { position: 1, file: { url: `${CDN}?x=1` } } } } },
      ...over.listing,
    },
  };
}

test('maps only whitelisted fields; prices from cents; address without house number', () => {
  const l = toPublic(item(), OPTS)!;
  assert.deepEqual(Object.keys(l).sort(), ['address', 'area', 'available', 'bedrooms', 'city', 'id', 'interior', 'lat', 'lon', 'neighbourhood', 'photo', 'postalCode', 'publishedAt', 'rent', 'status', 'type'].sort());
  assert.equal(l.rent, 1825);
  assert.equal(l.address, 'Teststraat');
  assert.equal(l.postalCode, '2582');
  assert.equal(l.lat, 52.092);
  assert.equal(l.lon, 4.278);
  assert.equal(l.neighbourhood, 'Geuzen- en Statenkwartier');
  assert.equal(l.bedrooms, 2);
  assert.equal(l.status, 'avail');
  assert.equal(l.available, 'now');
  assert.equal(l.photo, CDN, 'query string stripped');
  const json = JSON.stringify(l);
  for (const secret of ['SECRET', '999999', '6000', 'BAG']) assert.ok(!json.includes(secret), `${secret} must not leak`);
});

test('EXACT_ADDRESS shows house number, full postcode and precise pin', () => {
  const l = toPublic(item(), { ...OPTS, exactAddress: true })!;
  assert.equal(l.address, 'Teststraat 12a-2');
  assert.equal(l.postalCode, '2582XZ');
  assert.equal(l.lat, 52.09208);
});

test('statuses and availability', () => {
  assert.equal(toPublic(item({ listing: { label: 'rented' } }), OPTS)!.status, 'rented');
  assert.equal(toPublic(item({ rent: { available: false } }), OPTS)!.status, 'rented');
  assert.equal(toPublic(item({ rent: { contract: { availability: { status: 'under option' } } } }), OPTS)!.status, 'option');
  assert.equal(toPublic(item({ listing: { label: 'new' } }), OPTS)!.status, 'new');
  assert.equal(toPublic(item({ listing: { published_at: '2026-11-20 09:00:00' } }), OPTS)!.status, 'new');
  assert.equal(toPublic(item({ rent: { contract: { availability: { type: 'per date', available_from: '2027-02-01' } } } }), OPTS)!.available, '2027-02-01');
  assert.equal(toPublic(item({ rent: { contract: { availability: { type: 'per date', available_from: '2026-01-01' } } } }), OPTS)!.available, 'now');
  assert.equal(toPublic(item({ rent: { contract: { availability: { type: 'in consultation' } } } }), OPTS)!.available, 'consult');
  assert.equal(toPublic(item({ rent: { price_on_request: true } }), OPTS)!.rent, null);
  assert.equal(toPublic(item({ rent: { price: '1200000', period: 'yearly' } }), OPTS)!.rent, 1000);
});

test('hostile or unexpected input is dropped or neutralised', () => {
  assert.equal(toPublic(item({ type: 'parking facility' }), OPTS), null, 'type not included');
  assert.equal(toPublic(item({ address: { street: '' } }), OPTS), null, 'no street');
  assert.equal(toPublic({ ...item(), id: '<script>' }, OPTS), null, 'bad id');
  const evil = toPublic(item({ address: { street: '<img src=x onerror=alert(1)>Straat' } }), OPTS)!;
  assert.ok(!/[<>]/.test(evil.address));
  const offCdn = toPublic(item({ listing: { media: { photos: { main_media_id: 'm', medias: { m: { file: { url: 'https://evil.example/x.jpg' } } } } } } }), OPTS)!;
  assert.equal(offCdn.photo, null);
  const js = toPublic(item({ listing: { media: { photos: { main_media_id: 'm', medias: { m: { file: { url: 'javascript:alert(1)' } } } } } } }), OPTS)!;
  assert.equal(js.photo, null);
  assert.throws(() => mapResponse({ error: 'x' }, OPTS));
});

test('list is sorted: available first, rented last', () => {
  const r = mapResponse({ result: { properties: [
    { ...item({ listing: { label: 'rented' } }), id: 'aaaaaaaa-1' },
    { ...item(), id: 'bbbbbbbb-2' },
  ] } }, OPTS);
  assert.deepEqual(r.map((l) => l.status), ['avail', 'rented']);
});

// ---------- the worker itself ----------
class MemKV {
  m = new Map<string, string>();
  async get(k: string) { return this.m.get(k) ?? null; }
  async put(k: string, v: string) { this.m.set(k, v); }
}
const cacheStore = new Map<string, Response>();
(globalThis as Record<string, unknown>).caches = {
  default: {
    async match(r: Request) { return cacheStore.get(r.url)?.clone(); },
    async put(r: Request, res: Response) { cacheStore.set(r.url, res); },
  },
};
const { default: worker } = await import('../../api-worker/src/index.ts');
const ctx = { waitUntil: (p: Promise<unknown>) => { void p; } };
const TOKEN = 'test-token-should-never-leak';
const env = () => ({ LISTINGS_KV: new MemKV(), PARARIUS_OFFICE_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://www.karensrealestate.nl' });

function mockUpstream(status = 200) {
  const calls: Request[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(new Request(input, init));
    return new Response(JSON.stringify({ result: { properties: [item()] } }), { status });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = orig; } };
}

test('worker: routing, methods, CORS and no token leak', async () => {
  cacheStore.clear();
  const up = mockUpstream();
  try {
    const e = env();
    const get = (path: string, init: RequestInit = {}) => worker.fetch(new Request(`https://api.test${path}`, init), e, ctx);

    const ok = await get('/v1/listings?x=<script>', { headers: { Origin: 'https://www.karensrealestate.nl' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://www.karensrealestate.nl');
    assert.equal(ok.headers.get('X-Content-Type-Options'), 'nosniff');
    const text = await ok.text();
    assert.ok(!text.includes(TOKEN) && !text.includes('<script>'));
    assert.equal(JSON.parse(text).listings.length, 1);
    assert.equal(up.calls[0].headers.get('Authorization'), `Bearer ${TOKEN}`);

    assert.equal((await get('/v1/listings', { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await get('/v1/listings', { method: 'POST' })).status, 405);
    assert.equal((await get('/v1/listings', { method: 'DELETE' })).status, 405);
    assert.equal((await get('/api/properties')).status, 404);
    assert.equal((await get('/')).status, 404);

    // Many requests → still exactly one upstream call (served from cache/KV).
    for (let i = 0; i < 20; i++) assert.equal((await get('/v1/listings')).status, 200);
    cacheStore.clear();
    for (let i = 0; i < 5; i++) assert.equal((await get('/v1/listings')).status, 200);
    assert.equal(up.calls.length, 1);

    const etag = (await get('/v1/listings')).headers.get('ETag')!;
    assert.equal((await get('/v1/listings', { headers: { 'If-None-Match': etag } })).status, 304);

    const h = await (await get('/v1/health')).json() as Record<string, unknown>;
    assert.equal(h.ok, true);
    assert.ok(!JSON.stringify(h).includes(TOKEN));
  } finally { up.restore(); }
});

test('worker: cold start is locked, upstream errors keep the old data', async () => {
  cacheStore.clear();
  const up = mockUpstream(500);
  try {
    const e = env();
    const get = () => worker.fetch(new Request('https://api.test/v1/listings'), e, ctx);
    assert.equal((await get()).status, 503);
    assert.equal((await get()).status, 503);
    assert.equal(up.calls.length, 1, 'second cold request within 60 s does not call Pararius again');
  } finally { up.restore(); }

  const good = mockUpstream(200);
  const e = env();
  try { await worker.scheduled({}, e, { waitUntil: async (p) => { await p; } }); await new Promise((r) => setTimeout(r, 10)); } finally { good.restore(); }
  const before = await e.LISTINGS_KV.get('listings:v1');
  assert.ok(before);
  const bad = mockUpstream(429);
  try { await worker.scheduled({}, e, { waitUntil: async (p) => { await p; } }); await new Promise((r) => setTimeout(r, 10)); } finally { bad.restore(); }
  assert.equal(await e.LISTINGS_KV.get('listings:v1'), before);
});
