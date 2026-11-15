import type { APIRoute } from 'astro';
import { deliver, startOutboxWorker } from '../../../lib/server/deliver.ts';
import { clientIp, json } from '../../../lib/server/http.ts';
import { handleFormPost } from '../../../lib/server/submit.ts';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  startOutboxWorker();
  return handleFormPost(params.form ?? '', request, clientIp(request, clientAddress), { deliver });
};

export const ALL: APIRoute = () => json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
