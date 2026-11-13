// Production server: wraps the Astro Node handler with security headers,
// legacy redirects, an optional canonical-host redirect and startup checks.
// Start with:  NODE_ENV=production node server.mjs   (see README)
import http from 'node:http';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const production = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
const CANONICAL_HOST = (process.env.CANONICAL_HOST || '').toLowerCase(); // e.g. www.karensrealestate.nl

// ---- Startup configuration check (fail fast instead of silently losing leads) ----
{
  const missing = [];
  if ((process.env.FORM_SECRET || '').length < 32) missing.push('FORM_SECRET (min. 32 tekens)');
  if (!process.env.MAIL_TO) missing.push('MAIL_TO');
  if ((process.env.MAIL_TRANSPORT || 'smtp') === 'smtp') {
    if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
    if (!process.env.MAIL_FROM) missing.push('MAIL_FROM');
  } else if (production) missing.push('MAIL_TRANSPORT=smtp (file is alleen voor ontwikkeling)');
  if (!process.env.SITE_URL) missing.push('SITE_URL');
  if (missing.length) {
    const msg = `Ontbrekende/ongeldige configuratie: ${missing.join(', ')}. Zie .env.example.`;
    if (production) { console.error(JSON.stringify({ level: 'error', msg })); process.exit(1); }
    console.warn(JSON.stringify({ level: 'warn', msg }));
  }
}

const { handler } = await import('./dist/server/entry.mjs');

// ---- Security headers ----
const CSP = [
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
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  ...(production ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains' } : {}),
};

// ---- Permanent redirects for short/legacy URLs (301) ----
const REDIRECTS = new Map(Object.entries({
  '/home': '/', '/index.html': '/',
  '/aanhuur': '/aanhuurmakelaar-den-haag/', '/woning-zoeken': '/aanhuurmakelaar-den-haag/', '/huren': '/aanhuurmakelaar-den-haag/',
  '/verhuren': '/verhuurmakelaar-den-haag/', '/verhuur': '/verhuurmakelaar-den-haag/',
  '/beheer': '/vastgoedbeheer-den-haag/', '/vastgoedbeheer': '/vastgoedbeheer-den-haag/',
  '/aanbod': '/woningaanbod/', '/over': '/over-ons/', '/over-diana': '/over-ons/', '/privacy': '/privacyverklaring/', '/cookies': '/cookiebeleid/',
  '/en/find-a-home': '/en/rental-agent-the-hague/', '/en/let-your-home': '/en/letting-agent-the-hague/', '/en/listings': '/en/rental-listings/',
  '/en/about': '/en/about-us/', '/en/expats': '/en/expat-housing-the-hague/', '/en/privacy': '/en/privacy-statement/', '/en/cookies': '/en/cookie-policy/',
}));

const server = http.createServer((req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.removeHeader('X-Powered-By');

  const url = new URL(req.url || '/', 'http://x');
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim().toLowerCase();
  if (CANONICAL_HOST && host && host !== CANONICAL_HOST && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(301, { Location: `https://${CANONICAL_HOST}${url.pathname}${url.search}` });
    return res.end();
  }
  const target = REDIRECTS.get(url.pathname.replace(/\/$/, '') || '/');
  if (target && target !== url.pathname && (req.method === 'GET' || req.method === 'HEAD')) {
    res.writeHead(301, { Location: target + url.search, 'Cache-Control': 'public, max-age=86400' });
    return res.end();
  }
  if (url.pathname.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  else if (/\.(png|ico|svg|webmanifest|jpg)$/.test(url.pathname) && !url.pathname.startsWith('/_astro/')) res.setHeader('Cache-Control', 'public, max-age=86400');

  handler(req, res);
});

server.headersTimeout = 20_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'server listening', host: HOST, port: PORT, production }));
  // Start the outbox retry worker (delivers queued submissions after a restart).
  fetch(`http://127.0.0.1:${PORT}/api/health/`).catch(() => {});
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
