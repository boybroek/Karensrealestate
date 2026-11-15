import type { APIRoute } from 'astro';
import { LANGS, ROUTES, type PageKey, htmlLang } from '../i18n/index.ts';
import { SITEMAP_PRIORITY } from '../i18n/routes.ts';
import { DEMO } from '../content/listings.ts';

/** XML sitemap with hreflang alternates for every page in both languages. */
// No <lastmod>: a date that changes on every build is not a real modification date,
// and Google stops trusting lastmod for sites that send unreliable values.
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const urls = (Object.keys(ROUTES) as PageKey[]).flatMap((key) =>
    LANGS.map((lang) => {
      const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${htmlLang(l)}" href="${abs(ROUTES[key][l])}"/>`).join('\n');
      return `  <url>
    <loc>${abs(ROUTES[key][lang])}</loc>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(ROUTES[key].nl)}"/>
    <priority>${(SITEMAP_PRIORITY[key] ?? 0.5).toFixed(1)}</priority>
  </url>`;
    }),
  );
  const body = DEMO ? '' : urls.join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
