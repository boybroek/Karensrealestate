import type { APIRoute } from 'astro';
import { outboxSize, retryOutbox, startOutboxWorker } from '../../lib/server/deliver.ts';
import { json } from '../../lib/server/http.ts';

export const prerender = false;

/** Liveness + outbox backlog for monitoring (no personal data). */
export const GET: APIRoute = async () => {
  startOutboxWorker();
  void retryOutbox(); // fire-and-forget: never block the health check on SMTP
  const outbox = await outboxSize();
  return json({ ok: true, outbox });
};
