// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Canonical origin of the production site. Used for canonical URLs, hreflang,
// Open Graph, structured data, the sitemap and robots.txt.
const SITE_URL = (process.env.SITE_URL || 'https://www.karensrealestate.nl').replace(/\/$/, '');

// Two deployment targets share the same pages:
//  - node (default): Node server (server.mjs) with the /api/* routes from src/routes/api.
//  - cloudflare (DEPLOY_TARGET=cloudflare, see `npm run build:cf`): a purely static build;
//    the Cloudflare Worker in worker/index.ts serves it and handles /api/* itself.
const CLOUDFLARE = process.env.DEPLOY_TARGET === 'cloudflare';

/** Registers the on-demand API routes (Node target only). */
const apiRoutes = {
  name: 'kre-api-routes',
  hooks: {
    /** @param {{ injectRoute: (r: { pattern: string; entrypoint: string; prerender?: boolean }) => void }} o */
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/api/health', entrypoint: './src/routes/api/health.ts', prerender: false });
      injectRoute({ pattern: '/api/forms/token', entrypoint: './src/routes/api/forms/token.ts', prerender: false });
      injectRoute({ pattern: '/api/forms/[form]', entrypoint: './src/routes/api/forms/[form].ts', prerender: false });
    },
  },
};

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static', // every page is pre-rendered; only /api/* runs on demand
  ...(CLOUDFLARE ? {} : { adapter: node({ mode: 'standalone', bodySizeLimit: 64 * 1024 }) }),
  integrations: CLOUDFLARE ? [] : [apiRoutes],
  build: {
    format: 'directory',
    // No inline <style>/<script>: lets us run a strict Content-Security-Policy.
    inlineStylesheets: 'never',
  },
  security: { checkOrigin: true },
  prefetch: false,
  devToolbar: { enabled: false },
  image: {
    // Listing photos from Pararius Office are https URLs. They are downloaded and converted
    // at BUILD time and served from our own domain, so the strict CSP (img-src 'self') still holds.
    // Narrow this down to the exact photo host once it is known, e.g. { protocol: 'https', hostname: '**.pararius.nl' }.
    remotePatterns: [{ protocol: 'https', hostname: 'pararius-office-prod.global.ssl.fastly.net' }],
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
