// Full local end-to-end run: listings API worker + website worker, both on this machine.
//
//   npm run e2e:local
//
//   1. starts the listings API (api-worker/) on http://localhost:8788
//      – reads the real Pararius Office offer with the key in api-worker/.dev.vars
//   2. builds the site against that local API (static HTML with the current offer)
//   3. starts the website worker on http://localhost:8787 (CSP allows the local API)
//      – the browser loads the live offer from the local API, forms are stored locally
//
// Stop with Ctrl+C (stops both workers).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const API = 'http://localhost:8788';
const SITE = 'http://localhost:8787';
const win = process.platform === 'win32';
const children = [];

if (!existsSync('api-worker/.dev.vars')) {
  console.error('api-worker/.dev.vars ontbreekt (PARARIUS_OFFICE_TOKEN=… en ALLOWED_ORIGINS=http://localhost:8787).');
  process.exit(1);
}

function start(name, args, cwd) {
  const p = spawn('npx', ['wrangler@4', ...args], { cwd, shell: win, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = (d) => String(d).split('\n').filter(Boolean).forEach((l) => console.log(`[${name}] ${l}`));
  p.stdout.on('data', tag);
  p.stderr.on('data', tag);
  children.push(p);
  return p;
}

async function waitFor(url, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500 || r.status === 503) return r; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} niet bereikbaar`);
}

function stop() { for (const c of children) { try { win ? spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F']) : c.kill(); } catch { /* gone */ } } }
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('exit', stop);

console.log('1/3 Listings-API starten…');
start('api', ['dev', '--port', '8788', '--test-scheduled'], 'api-worker');
await waitFor(`${API}/v1/health`);
let res = await waitFor(`${API}/v1/listings`);
if (res.status !== 200) throw new Error(`Listings-API gaf ${res.status} (token of Pararius-limiet? probeer over een minuut opnieuw)`);
const { count, version } = await res.json();
console.log(`    ${count} woningen uit Pararius Office (versie ${version})`);

console.log('2/3 Site bouwen tegen de lokale API…');
const b = spawnSync(process.execPath, ['scripts/build-cf.mjs'], { env: { ...process.env, LISTINGS_API_URL: API }, stdio: 'inherit' });
if (b.status !== 0) { stop(); process.exit(b.status ?? 1); }

console.log('3/3 Website starten…');
start('site', ['dev', '--port', '8787', '--var', `LISTINGS_API_URL:${API}`], '.');
await waitFor(`${SITE}/`);
console.log(`\nKlaar. Open ${SITE}/woningaanbod/  (API: ${API}/v1/listings)\nStoppen: Ctrl+C\n`);
