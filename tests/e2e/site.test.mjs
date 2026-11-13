import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const BASE = process.env.E2E_BASE;
const DATA = process.env.E2E_DATA;
const PAGES = {
  nl: ['/', '/aanhuurmakelaar-den-haag/', '/verhuurmakelaar-den-haag/', '/vastgoedbeheer-den-haag/', '/expats/', '/woningaanbod/', '/over-ons/', '/contact/', '/privacyverklaring/', '/cookiebeleid/'],
  en: ['/en/', '/en/rental-agent-the-hague/', '/en/letting-agent-the-hague/', '/en/property-management-the-hague/', '/en/expat-housing-the-hague/', '/en/rental-listings/', '/en/about-us/', '/en/contact/', '/en/privacy-statement/', '/en/cookie-policy/'],
};
const ALL = [...PAGES.nl, ...PAGES.en];

let browser;
before(async () => { browser = await pw.chromium.launch(); });
after(async () => { await browser?.close(); });

async function page(path, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, ...(opts.mobile ? { isMobile: true, hasTouch: true } : {}) });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(e.message));
  const res = await p.goto(BASE + path, { waitUntil: 'load' });
  return { p, ctx, res, errors };
}

async function mails() {
  try {
    const dir = join(DATA, 'dev-mail');
    const files = (await readdir(dir)).sort();
    return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8'))));
  } catch { return []; }
}

test('every page: 200, SEO metadata, one h1, valid JSON-LD, no console errors', async () => {
  const titles = new Set(), descs = new Set();
  for (const path of ALL) {
    const { p, ctx, res, errors } = await page(path);
    assert.equal(res.status(), 200, path);
    const info = await p.evaluate(() => ({
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      hreflang: Array.from(document.querySelectorAll('link[rel=alternate][hreflang]')).map((l) => l.hreflang),
      h1: document.querySelectorAll('h1').length,
      lang: document.documentElement.lang,
      ld: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent),
      robots: document.querySelector('meta[name=robots]')?.content,
      og: document.querySelector('meta[property="og:image"]')?.content,
      imgsWithoutAlt: Array.from(document.querySelectorAll('img:not([alt])')).length,
    }));
    assert.ok(info.title && info.title.length <= 70, `${path} title: ${info.title}`);
    assert.ok(info.desc && info.desc.length >= 70 && info.desc.length <= 175, `${path} description length ${info.desc?.length}`);
    assert.ok(info.canonical?.endsWith(path), `${path} canonical ${info.canonical}`);
    assert.deepEqual(info.hreflang.sort(), ['en', 'nl-NL', 'x-default'], path);
    assert.equal(info.h1, 1, `${path} h1 count`);
    assert.equal(info.lang, path.startsWith('/en/') ? 'en' : 'nl-NL');
    assert.match(info.robots, /^index/);
    assert.ok(info.og);
    assert.equal(info.imgsWithoutAlt, 0, `${path} images without alt`);
    for (const ld of info.ld) {
      const j = JSON.parse(ld);
      assert.ok(j['@graph'].some((n) => n['@id']?.endsWith('/#organization')), `${path} org in JSON-LD`);
    }
    assert.ok(!titles.has(info.title), `duplicate title ${info.title}`); titles.add(info.title);
    assert.ok(!descs.has(info.desc), `duplicate description on ${path}`); descs.add(info.desc);
    assert.deepEqual(errors, [], `${path} console errors`);
    await ctx.close();
  }
});

test('no broken internal links, every page reachable', async () => {
  const seen = new Set(), queue = ['/'];
  const broken = [];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await fetch(BASE + path, { redirect: 'manual' });
    if (res.status !== 200) { broken.push(`${path} → ${res.status}`); continue; }
    const html = await res.text();
    for (const [, href] of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
      if (href.startsWith('/') && !href.startsWith('//')) {
        if (/\.(css|js|woff2|webp|png|jpg|svg|ico|webmanifest|avif)$/.test(href)) {
          if (!seen.has(href)) { seen.add(href); const r = await fetch(BASE + href); if (r.status !== 200) broken.push(`${href} → ${r.status}`); }
        } else queue.push(href);
      }
    }
  }
  assert.deepEqual(broken, []);
  for (const p of ALL) assert.ok(seen.has(p), `not linked internally: ${p}`);
});

test('sitemap, robots, 404, redirects, security headers, no cookies', async () => {
  const sm = await (await fetch(BASE + '/sitemap.xml')).text();
  assert.equal((sm.match(/<loc>/g) ?? []).length, 20);
  assert.match(sm, /hreflang="x-default"/);
  const robots = await (await fetch(BASE + '/robots.txt')).text();
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);

  const nf = await fetch(BASE + '/bestaat-niet/');
  assert.equal(nf.status, 404);
  assert.match(await nf.text(), /noindex/);

  const r = await fetch(BASE + '/aanhuur', { redirect: 'manual' });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/aanhuurmakelaar-den-haag/');
  const slash = await fetch(BASE + '/contact', { redirect: 'manual' });
  assert.equal(slash.status, 301);

  const h = await fetch(BASE + '/');
  const csp = h.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(h.headers.get('referrer-policy'));
  assert.ok(h.headers.get('permissions-policy'));
  assert.equal(h.headers.get('set-cookie'), null);
  const tok = await fetch(BASE + '/api/forms/token/');
  assert.equal(tok.headers.get('set-cookie'), null);
  assert.equal(tok.headers.get('cache-control'), 'no-store');
  const asset = (await h.text()).match(/\/_astro\/[^"]+\.css/)[0];
  assert.match((await fetch(BASE + asset)).headers.get('cache-control'), /immutable/);
});

test('language switch links to the translated page', async () => {
  const { p, ctx } = await page('/verhuurmakelaar-den-haag/');
  await p.click('.lang-switch a[hreflang=en]');
  await p.waitForURL('**/en/letting-agent-the-hague/');
  assert.match(await p.textContent('h1'), /Letting your home/);
  await p.click('.lang-switch a[hreflang=nl]');
  await p.waitForURL('**/verhuurmakelaar-den-haag/');
  await ctx.close();
});

test('mobile: menu opens, navigates and closes with Escape; no horizontal scroll', async () => {
  for (const path of ['/', '/aanhuurmakelaar-den-haag/', '/en/contact/']) {
    const { p, ctx } = await page(path, { mobile: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `${path} horizontal overflow ${overflow}px`);
    await ctx.close();
  }
  const { p, ctx } = await page('/', { mobile: true });
  assert.equal(await p.isVisible('.nav--desktop'), false);
  await p.click('.menu-toggle');
  assert.equal(await p.getAttribute('.menu-toggle', 'aria-expanded'), 'true');
  await p.waitForSelector('#mobile-menu.is-open');
  await p.keyboard.press('Escape');
  assert.equal(await p.getAttribute('.menu-toggle', 'aria-expanded'), 'false');
  await p.click('.menu-toggle');
  await p.click('#mobile-menu a[href="/over-ons/"]');
  await p.waitForURL('**/over-ons/');
  await ctx.close();
});

test('contact form: client validation, then successful delivery', async () => {
  const { p, ctx, errors } = await page('/contact/?onderwerp=manage');
  assert.equal(await p.inputValue('select[name=topic]'), 'manage');
  await p.click('form[data-form=contact] button[type=submit]');
  await p.waitForSelector('[data-field=name].has-error');
  assert.ok(await p.isVisible('[data-alert]'));
  assert.match(await p.textContent('#contact-email-err'), /verplicht/);
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'contact-name');

  await p.fill('#contact-name', 'Jan E2E');
  await p.fill('#contact-email', 'jan.e2e@');
  await p.fill('#contact-phone', '12345');
  await p.click('#contact-message');
  assert.match(await p.textContent('#contact-email-err'), /geldig e-mailadres/);
  assert.match(await p.textContent('#contact-phone-err'), /telefoonnummer/);
  await p.fill('#contact-email', 'jan.e2e@example.nl');
  await p.fill('#contact-phone', '06 12345678');
  await p.fill('#contact-message', 'Ik heb een vraag over beheer van mijn woning. <script>alert(1)</script>');
  const before = (await mails()).length;
  await p.click('form[data-form=contact] button[type=submit]');
  await p.waitForSelector('[data-success]:not([hidden])', { timeout: 15_000 });
  assert.equal(await p.isHidden('form[data-form=contact]'), true);
  const all = await mails();
  assert.equal(all.length, before + 1);
  const m = all.at(-1);
  assert.match(m.subject, /Nieuw contactbericht – Jan E2E/);
  assert.equal(m.replyTo[0].address, 'jan.e2e@example.nl');
  assert.match(m.text, /Ik zoek ondersteuning bij beheer/);
  assert.match(m.text, /\+31 6 12 34 56 78/);
  assert.ok(m.html.includes('&lt;script&gt;'), 'HTML escaped in mail');
  assert.ok(!m.html.includes('<script>alert'), 'no raw script in mail');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('search request (aanhuur): steps, back/forward, student/working panels, submit', async () => {
  const { p, ctx, errors } = await page('/aanhuurmakelaar-den-haag/');
  const step = (i) => p.isVisible(`[data-form=zoekopdracht] [data-step="${i}"]`);
  assert.equal(await step(0), true);
  assert.equal(await step(1), false);
  // Working panel visible by default; switch to student
  assert.equal(await p.isVisible('#zoekopdracht-employer'), true);
  await p.click('.segment label:has(input[value=student])');
  await p.waitForTimeout(600);
  assert.equal(await p.isDisabled('#zoekopdracht-employer'), true);
  assert.equal(await p.isVisible('#zoekopdracht-institution'), true);
  assert.match(await p.textContent('[data-submit-label]'), /als student/);
  await p.fill('#zoekopdracht-institution', 'Haagse Hogeschool');
  await p.click('.chipopt:has(input[name=guarantor][value=yes])');
  await p.fill('#zoekopdracht-guarantorIncome', 'heel veel');
  await p.click('[data-step="0"] [data-next]');
  assert.equal(await step(0), true, 'invalid amount blocks next step');
  assert.match(await p.textContent('#zoekopdracht-guarantorIncome-err'), /bedrag/);
  await p.fill('#zoekopdracht-guarantorIncome', '€ 4.500');
  await p.click('[data-step="0"] [data-next]');
  assert.equal(await step(1), true);
  assert.match(await p.getAttribute('[data-stepper]', 'aria-label'), /Stap 2 van 3/);

  // Wish dropdowns (single + multi)
  await p.click('[data-field=bedrooms] .wish__btn');
  await p.click('[data-field=bedrooms] label:has(input[value="2"])');
  assert.match(await p.textContent('#zoekopdracht-bedrooms-summary'), /2 slaapkamer/);
  assert.equal(await p.getAttribute('[data-field=bedrooms] .wish__btn', 'aria-expanded'), 'false');
  await p.click('[data-field=extras] .wish__btn');
  await p.click('[data-field=extras] label:has(input[value=pets])');
  await p.click('[data-field=extras] label:has(input[value=lift])');
  assert.match(await p.textContent('#zoekopdracht-extras-summary'), /Huisdieren, Lift/);
  await p.keyboard.press('Escape');
  await p.fill('#zoekopdracht-maxRent', '1500');

  // back and forward keep values
  await p.click('[data-step="1"] [data-back]');
  assert.equal(await step(0), true);
  assert.equal(await p.inputValue('#zoekopdracht-institution'), 'Haagse Hogeschool');
  await p.click('[data-step="0"] [data-next]');
  await p.click('[data-step="1"] [data-next]');
  assert.equal(await step(2), true);

  await p.click('[data-form=zoekopdracht] button[type=submit]');
  assert.ok(await p.isVisible('[data-field=consent].has-error'));
  await p.fill('#zoekopdracht-name', 'Jan E2E');
  await p.fill('#zoekopdracht-email', 'jan.e2e@example.nl');
  await p.fill('#zoekopdracht-phone', '0612345678');
  await p.check('#zoekopdracht-consent');
  await p.click('[data-form=zoekopdracht] button[type=submit]');
  await p.waitForSelector('[data-form-wrap] [data-success]:not([hidden])', { timeout: 15_000 });
  const m = (await mails()).at(-1);
  assert.match(m.subject, /woningzoekopdracht/);
  assert.match(m.text, /Zoekt als: Student/);
  assert.match(m.text, /Onderwijsinstelling: Haagse Hogeschool/);
  assert.match(m.text, /€ 4\.500 per maand/);
  assert.match(m.text, /Huisdieren, Lift/);
  assert.doesNotMatch(m.text, /Werkgever/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('expat link pre-fills the search request', async () => {
  const { p, ctx } = await page('/aanhuurmakelaar-den-haag/?situatie=expat#zoekopdracht');
  assert.equal(await p.isChecked('input[name=profile][value=working]'), true);
  assert.equal(await p.inputValue('#zoekopdracht-abroad'), 'yes');
  await ctx.close();
});

test('letting form (EN): postcode validation and submit', async () => {
  const { p, ctx, errors } = await page('/en/letting-agent-the-hague/');
  await p.fill('#verhuur-address', 'Testlaan 1');
  await p.fill('#verhuur-postcode', '12345');
  await p.click('[data-form=verhuur] [data-step="0"] [data-next]');
  assert.match(await p.textContent('#verhuur-postcode-err'), /valid Dutch postcode/);
  await p.fill('#verhuur-postcode', '2583em');
  await p.click('.chipopt:has(input[name=propertyType][value=apartment])');
  await p.fill('#verhuur-area', '78');
  await p.click('[data-form=verhuur] [data-step="0"] [data-next]');
  await p.fill('#verhuur-name', 'Jan E2E');
  await p.fill('#verhuur-email', 'jan.e2e@example.nl');
  await p.click('[data-form=verhuur] button[type=submit]');
  assert.ok(await p.isVisible('[data-field=phone].has-error'), 'phone required for letting');
  await p.fill('#verhuur-phone', '+31 6 12345678');
  await p.check('#verhuur-consent');
  await p.click('[data-form=verhuur] button[type=submit]');
  await p.waitForSelector('[data-success]:not([hidden])', { timeout: 15_000 });
  assert.match(await p.textContent('[data-success]'), /Thank you for registering/);
  const m = (await mails()).at(-1);
  assert.match(m.text, /Postcode: 2583 EM/);
  assert.match(m.text, /Woonoppervlakte: 78 m²/);
  assert.match(m.text, /Taal bezoeker: Engels/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('API hardening: origin, content type, token, honeypot, server validation, rate limit', async () => {
  const url = BASE + '/api/forms/contact/';
  const good = { lang: 'nl', name: 'Bot Test', email: 'bot@example.nl', topic: 'other', message: 'Hallo daar' };
  const post = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE, ...headers }, body: JSON.stringify(body) });
  const token = async () => (await (await fetch(BASE + '/api/forms/token/')).json()).token;

  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403, 'no origin');
  assert.equal((await post(good, { Origin: 'https://evil.example' })).status, 403, 'foreign origin');
  assert.ok([403, 415].includes((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE }, body: 'name=x' })).status), 'non-JSON rejected');
  assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: BASE }, body: '{}' })).status === 200, false);
  assert.equal((await post(good)).status, 409, 'missing token');
  assert.equal((await post({ ...good, _token: 'abc.def.ghi' })).status, 409, 'forged token');
  assert.equal((await fetch(BASE + '/api/forms/unknown/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: '{}' })).status, 404);

  const before = (await mails()).length;
  const fast = await post({ ...good, _token: await token() });
  assert.equal(fast.status, 200, 'too-fast submission gets silent ok');
  const t1 = await token();
  await new Promise((r) => setTimeout(r, 3100));
  const hp = await post({ ...good, website: 'http://spam', _token: t1 });
  assert.equal(hp.status, 200, 'honeypot gets silent ok');
  assert.equal((await mails()).length, before, 'bots produce no mail');

  const t2 = await token();
  await new Promise((r) => setTimeout(r, 3100));
  const bad = await post({ ...good, email: 'nope', topic: 'hack', _token: t2 });
  assert.equal(bad.status, 422);
  assert.deepEqual((await bad.json()).errors, { email: 'email', topic: 'choice' });
  const ok = await post({ ...good, _token: t2 });
  assert.equal(ok.status, 200);
  assert.equal((await post({ ...good, _token: t2 })).status, 409, 'token cannot be replayed');
  assert.equal((await fetch(url)).status, 405);

  let limited = false;
  for (let i = 0; i < 10 && !limited; i++) limited = (await post(good)).status === 429;
  assert.ok(limited, 'rate limit kicks in');
});
