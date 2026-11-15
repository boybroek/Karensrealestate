// End-to-end tests against the production build (node server.mjs).
// Usage: npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const PORT = Number(process.env.E2E_PORT || 4399);
const dataDir = await mkdtemp(join(tmpdir(), 'kre-e2e-'));
const server = spawn(process.execPath, ['server.mjs'], {
  env: {
    ...process.env, NODE_ENV: 'development', PORT: String(PORT), HOST: '127.0.0.1',
    SITE_URL: `http://localhost:${PORT}`, FORM_SECRET: 'e2e-'.padEnd(48, 'x'),
    MAIL_TRANSPORT: 'file', MAIL_TO: 'office@example.test', MAIL_FROM: 'website@example.test',
    DATA_DIR: dataDir, FORM_RATE_LIMIT: '12',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const logs = [];
server.stdout.on('data', (b) => logs.push(String(b)));
server.stderr.on('data', (b) => logs.push(String(b)));
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/api/health/`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

process.env.E2E_BASE = `http://localhost:${PORT}`;
process.env.E2E_DATA = dataDir;
globalThis.__pw = playwright;

const stream = run({ files: [fileURLToPath(new URL('./site.test.mjs', import.meta.url))], concurrency: false, timeout: 180_000 });
stream.compose(spec).pipe(process.stdout);
let failed = 0;
stream.on('test:fail', () => failed++);
await new Promise((r) => stream.on('end', r));
server.kill('SIGTERM');
const allLogs = logs.join('');
if (failed) console.log('\n--- server log ---\n' + allLogs);
// Privacy check: server logs must never contain submitted personal data.
if (/jan\.e2e@example\.nl|0612345678|Testlaan/.test(allLogs)) { console.error('PII found in server logs!'); failed++; }
await rm(dataDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
