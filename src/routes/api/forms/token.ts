import type { APIRoute } from 'astro';
import { clientIp, json } from '../../../lib/server/http.ts';
import { handleTokenGet } from '../../../lib/server/submit.ts';

export const prerender = false;

export const GET: APIRoute = ({ request, clientAddress }) => handleTokenGet(request, clientIp(request, clientAddress));

export const ALL: APIRoute = () => json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
