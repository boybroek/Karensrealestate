// Cloudflare Worker for Karens Real Estate.
// Serves the static Astro build (dist/, built with `npm run build:cf`) and handles the
// form API. It replaces server.mjs on Cloudflare: same security headers, legacy
// redirects, canonical-host redirect and /api/* endpoints.
// Local: `npm run cf:dev`   Deploy: `npm run cf:deploy`   (see README §4, option C)
import { json } from '../src/lib/server/http.ts';
import { log } from '../src/lib/server/log.ts';
import { handleFormPost, handleTokenGet } from '../src/lib/server/submit.ts';
import { MAX_AGE_MS } from '../src/lib/server/token.ts';
import { makeDeliver, outboxSize, retryOutbox } from './deliver.ts';
import type { Ctx, Env } from './types.ts';

const env = (k: string) => (process.env[k] ?? '').trim();
const production = () => env('NODE_ENV') === 'production';

// ---- Security headers (kept identical to server.mjs) ----
function securityHeaders(): Record<string, string> {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://www.openstreetmap.org',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(production() ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    ...(production() ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains' } : {}),
  };
}

// ---- Permanent redirects for short/legacy URLs (301), same list as server.mjs ----
const REDIRECTS = new Map(Object.entries({
  '/home': '/', '/index.html': '/',
  '/aanhuur': '/aanhuurmakelaar-den-haag/', '/woning-zoeken': '/aanhuurmakelaar-den-haag/', '/huren': '/aanhuurmakelaar-den-haag/',
  '/verhuren': '/verhuurmakelaar-den-haag/', '/verhuur': '/verhuurmakelaar-den-haag/',
  '/beheer': '/vastgoedbeheer-den-haag/', '/vastgoedbeheer': '/vastgoedbeheer-den-haag/',
  '/aanbod': '/woningaanbod/', '/over': '/over-ons/', '/over-diana': '/over-ons/', '/privacy': '/privacyverklaring/', '/cookies': '/cookiebeleid/',
  '/en/find-a-home': '/en/rental-agent-the-hague/', '/en/let-your-home': '/en/letting-agent-the-hague/', '/en/listings': '/en/rental-listings/',
  // URLs of the previous website (eazlee), so old links and Google results keep working.
  '/privacy-verklaring': '/privacyverklaring/', '/cookies-policy': '/cookiebeleid/',
  '/woning-huren': '/aanhuurmakelaar-den-haag/', '/woning-verhuren': '/verhuurmakelaar-den-haag/',
  '/woning-kopen': '/', '/woning-verkopen': '/',
  '/en/about': '/en/about-us/', '/en/expats': '/en/expat-housing-the-hague/', '/en/privacy': '/en/privacy-statement/', '/en/cookies': '/en/cookie-policy/',
}));

const redirect = (location: string, cache = true) =>
  new Response(null, { status: 301, headers: { Location: location, ...(cache ? { 'Cache-Control': 'public, max-age=86400' } : {}) } });

async function api(path: string, request: Request, e: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const p = path.replace(/\/?$/, '/');

  if (p === '/api/health/') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
    return json({ ok: true, outbox: await outboxSize(e.KRE_KV) });
  }
  if (p === '/api/forms/token/') {
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
    return handleTokenGet(request, ip);
  }
  const m = /^\/api\/forms\/([^/]+)\/$/.exec(p);
  if (m) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    const kv = e.KRE_KV;
    return handleFormPost(m[1], request, ip, {
      deliver: makeDeliver(kv),
      nonceStore: kv && {
        used: async (n) => (await kv.get(`nonce:${n}`)) !== null,
        consume: (n) => kv.put(`nonce:${n}`, '1', { expirationTtl: Math.ceil(MAX_AGE_MS / 1000) }),
      },
    });
  }
  return json({ error: 'not_found' }, 404);
}

async function route(request: Request, e: Env): Promise<Response> {
  const url = new URL(request.url);
  const read = request.method === 'GET' || request.method === 'HEAD';

  const canonical = env('CANONICAL_HOST').toLowerCase();
  if (canonical && read && url.hostname !== canonical && !url.hostname.endsWith('.workers.dev') && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return redirect(`https://${canonical}${url.pathname}${url.search}`, false);
  }

  if (url.pathname.startsWith('/api/')) return api(url.pathname, request, e);

  if (read) {
    const target = REDIRECTS.get(url.pathname.replace(/\/$/, '') || '/');
    if (target && target !== url.pathname) return redirect(target + url.search);
    // trailingSlash: 'always' — /contact → /contact/ (files such as /favicon.ico are left alone).
    const last = url.pathname.split('/').pop() ?? '';
    if (last && !last.includes('.')) return redirect(`${url.pathname}/${url.search}`);
  }

  const res = await e.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  if (url.pathname.startsWith('/_astro/')) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  else if (/\.(png|ico|svg|webmanifest|jpg|woff2)$/.test(url.pathname)) out.headers.set('Cache-Control', 'public, max-age=86400');
  return out;
}

export default {
  async fetch(request: Request, e: Env, _ctx: Ctx): Promise<Response> {
    let res: Response;
    try { res = await route(request, e); }
    catch (err) {
      log('error', 'unhandled error', { error: String(err).slice(0, 200) });
      res = json({ error: 'server_error' }, 500);
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(securityHeaders())) out.headers.set(k, v);
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) out.headers.set('Cache-Control', 'no-store');
    // SEO: only the real domain may be indexed. Previews (*.workers.dev, localhost …) get noindex,
    // so Google never sees them as duplicate content of www.karensrealestate.nl.
    const canonical = env('CANONICAL_HOST').toLowerCase();
    if (!canonical || url.hostname !== canonical) out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  },

  /** Cron trigger (every 5 minutes): retry submissions waiting in the outbox. */
  async scheduled(_controller: unknown, e: Env, ctx: Ctx): Promise<void> {
    ctx.waitUntil(retryOutbox(e.KRE_KV).then((r) => { if (r.sent || r.left) log('info', 'outbox retry', r); }));
  },
};
