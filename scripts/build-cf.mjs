// Static build for the Cloudflare Worker (no Node adapter; the Worker serves dist/ and handles /api/*).
// Usage: npm run build:cf                 → production content
//        node scripts/build-cf.mjs --demo → with sample reviews (marked as demo, noindex)
// Listings come from the listings API worker (api-worker/). Override with LISTINGS_API_URL,
// e.g. LISTINGS_API_URL=http://localhost:8788 for a fully local end-to-end run.
import { spawnSync } from 'node:child_process';

const demo = process.argv.includes('--demo');
const LISTINGS_API_URL = process.env.LISTINGS_API_URL || 'https://karensrealestate-api.boy-grabacio.workers.dev';
const r = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  env: { ...process.env, DEPLOY_TARGET: 'cloudflare', LISTINGS_API_URL, ...(demo ? { KRE_DEMO_CONTENT: '1' } : {}) },
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
