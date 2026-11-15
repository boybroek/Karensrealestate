// Static build for the Cloudflare Worker (no Node adapter; the Worker serves dist/ and handles /api/*).
// Usage: npm run build:cf            → production content
//        node scripts/build-cf.mjs --demo → with sample listings/reviews (marked as demo, noindex)
import { spawnSync } from 'node:child_process';

const demo = process.argv.includes('--demo');
const r = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  env: { ...process.env, DEPLOY_TARGET: 'cloudflare', ...(demo ? { KRE_DEMO_CONTENT: '1' } : {}) },
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
