import type { APIRoute } from 'astro';
import { DEMO } from '../content/listings.ts';

export const GET: APIRoute = ({ site }) => {
  const body = DEMO
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
