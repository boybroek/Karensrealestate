// Starts a local demo of the site with sample listings and reviews.
// Forms work: submissions are written to data/dev-mail/ instead of being e-mailed.
// Usage: npm run demo   → open http://localhost:4321
import { spawnSync, spawn } from 'node:child_process';

const env = {
  ...process.env,
  KRE_DEMO_CONTENT: '1',
  SITE_URL: 'http://localhost:4321',
  PORT: '4321',
  HOST: '127.0.0.1',
  NODE_ENV: 'development',
  FORM_SECRET: 'local-demo-secret-local-demo-secret-0001',
  MAIL_TRANSPORT: 'file',
  MAIL_TO: 'demo@example.test',
  MAIL_FROM: 'website@example.test',
  DATA_DIR: './data',
};

console.log('Demo bouwen…');
const build = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

console.log('\nDemo draait op http://localhost:4321  (stoppen: Ctrl+C)');
console.log('Verstuurde formulieren staan in data/dev-mail/\n');
console.log('Let op: voer vóór een echte livegang weer `npm run build` uit.\n');
spawn(process.execPath, ['server.mjs'], { env, stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0));
