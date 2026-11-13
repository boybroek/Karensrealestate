// Builds the concept presentation (KRE_CONCEPT=1) and exports it as a fully
// static, path-relative package in concept-dist/ for a private preview host.
// - all root-absolute links/assets become relative (works under any sub-path)
// - fonts are inlined in the CSS (no font requests to resolve)
// - index.html is reduced to head+body content for hosts that wrap the start page
// Usage: node scripts/build-concept.mjs
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { join, relative, dirname, posix } from 'node:path';

const OUT = 'concept-dist';
const env = { ...process.env, KRE_CONCEPT: '1', SITE_URL: 'https://concept.invalid' };
const b = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { env, stdio: 'inherit' });
if (b.status !== 0) process.exit(b.status ?? 1);

await rm(OUT, { recursive: true, force: true });
await cp('dist/client', OUT, { recursive: true });
for (const f of ['404.html', 'sitemap.xml', 'robots.txt', 'site.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og', 'brand']) await rm(join(OUT, f), { recursive: true, force: true });

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
// Hosts may reserve names starting with "_": publish assets under assets/ instead of _astro/.
await cp(join(OUT, '_astro'), join(OUT, 'assets'), { recursive: true });
await rm(join(OUT, '_astro'), { recursive: true, force: true });
for (const f of await walk(OUT)) {
  if (!/\.(html|css|js)$/.test(f)) continue;
  const s = await readFile(f, 'utf8');
  if (s.includes('/_astro/')) await writeFile(f, s.split('/_astro/').join('/assets/'));
}
const files = await walk(OUT);

// Inline fonts into CSS.
for (const css of files.filter((f) => f.endsWith('.css'))) {
  let s = await readFile(css, 'utf8');
  const urls = [...new Set([...s.matchAll(/url\(\s*["']?(\/assets\/[^"')]+\.woff2)["']?\s*\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const data = (await readFile(join(OUT, u))).toString('base64');
    s = s.split(u).join(`data:font/woff2;base64,${data}`);
  }
  if (/url\(\s*["']?\//.test(s)) s = s.replace(/url\(\s*(["']?)\/assets\//g, 'url($1');
  await writeFile(css, s);
}
for (const f of files.filter((f) => f.endsWith('.woff2'))) await rm(f);

// Rewrite root-absolute URLs in HTML to relative ones.
const toRel = (fromFile, url) => {
  const m = /^([^?#]*)([?#].*)?$/.exec(url);
  let p = m[1];
  const rest = m[2] ?? '';
  if (p.endsWith('/')) p += 'index.html';
  else if (!posix.basename(p).includes('.')) p += '/index.html';
  const fromDir = posix.dirname(relative(OUT, fromFile).split('\\').join('/'));
  let r = posix.relative(fromDir, p.slice(1));
  if (!r.startsWith('.')) r = './' + r;
  return r + rest;
};
const html = files.filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));
for (const f of html) {
  let s = await readFile(f, 'utf8');
  s = s.replace(/<link rel="preload"[^>]*as="font"[^>]*>/g, '').replace(/<link rel="manifest"[^>]*>/g, '');
  s = s.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_, a, u) => `${a}="${toRel(f, u)}"`);
  s = s.replace(/\bsrcset="([^"]+)"/g, (_, v) => `srcset="${v.split(',').map((part) => {
    const [u, d] = part.trim().split(/\s+/);
    return (u.startsWith('/') ? toRel(f, u) : u) + (d ? ' ' + d : '');
  }).join(', ')}"`);
  if (relative(OUT, f) === 'index.html') {
    const lang = /<html lang="([^"]+)"/.exec(s)?.[1] ?? 'nl-NL';
    const head = /<head>([\s\S]*)<\/head>/.exec(s)[1].replace(/<title>[^<]*<\/title>/, '<title>Karens Real Estate Concept</title>');
    const body = /<body>([\s\S]*)<\/body>/.exec(s)[1];
    s = head.replace('<title>', `<script>document.documentElement.lang=${JSON.stringify(lang)}</script>\n<title>`) + '\n' + body;
    // Move <title> to the very top (hosts scan the start of the file for it).
    const t = /<title>[^<]*<\/title>/.exec(s)[0];
    s = t + '\n' + s.replace(t, '');
  }
  await writeFile(f, s);
}

// Report
const final = await walk(OUT);
let total = 0;
for (const f of final) total += (await stat(f)).size;
const left = [];
for (const f of final.filter((f) => /\.(html|css|js)$/.test(f))) {
  const s = await readFile(f, 'utf8');
  if (/(href|src)="\/(?!\/)/.test(s) || /["'(]\/(assets|_astro)\//.test(s)) left.push(relative(OUT, f));
}
console.log(`\nconcept-dist: ${final.length} bestanden, ${(total / 1024).toFixed(0)} KB`);
if (left.length) { console.error('Nog absolute paden in:', left); process.exit(1); }
