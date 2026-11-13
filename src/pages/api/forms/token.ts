import type { APIRoute } from 'astro';
import { issueToken } from '../../../lib/server/token.ts';
import { hashIp, hit } from '../../../lib/server/ratelimit.ts';
import { clientIp, json } from '../../../lib/server/http.ts';

export const prerender = false;

export const GET: APIRoute = ({ request, clientAddress }) => {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden' }, 403);
  const ip = hashIp(clientIp(request, clientAddress));
  const wait = hit({ key: `tok:${ip}`, max: 30, windowMs: 10 * 60_000 });
  if (wait) return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(wait) });
  return json({ token: issueToken() });
};

export const ALL: APIRoute = () => json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
