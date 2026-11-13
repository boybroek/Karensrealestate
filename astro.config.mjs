// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Canonical origin of the production site. Used for canonical URLs, hreflang,
// Open Graph, structured data, the sitemap and robots.txt.
const SITE_URL = (process.env.SITE_URL || 'https://www.karensrealestate.nl').replace(/\/$/, '');

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static', // every page is pre-rendered; only /api/* runs on demand
  adapter: node({ mode: 'standalone', bodySizeLimit: 64 * 1024 }),
  build: {
    format: 'directory',
    // No inline <style>/<script>: lets us run a strict Content-Security-Policy.
    inlineStylesheets: 'never',
  },
  security: { checkOrigin: true },
  prefetch: false,
  devToolbar: { enabled: false },
  image: {
    // Only local images are processed; no remote image domains are allowed.
    domains: [],
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
