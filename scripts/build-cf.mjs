// Static build for the Cloudflare Worker (no Node adapter; the Worker serves dist/ and handles /api/*).
// Usage: npm run build:cf
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  env: { ...process.env, DEPLOY_TARGET: 'cloudflare' },
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
