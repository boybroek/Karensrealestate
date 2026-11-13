import type { APIRoute } from 'astro';
import { isFormId } from '../../../lib/forms/schema.ts';
import { validateForm } from '../../../lib/forms/validate.ts';
import { consumeToken, verifyToken } from '../../../lib/server/token.ts';
import { hashIp, hit } from '../../../lib/server/ratelimit.ts';
import { deliver, newSubmission, startOutboxWorker } from '../../../lib/server/deliver.ts';
import { clientIp, json, originAllowed } from '../../../lib/server/http.ts';
import { log } from '../../../lib/server/log.ts';
import { config } from '../../../lib/server/config.ts';

export const prerender = false;

const MAX_BODY = 32 * 1024;
const URL_RE = /(https?:\/\/|www\.)/gi;

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  startOutboxWorker();
  const form = params.form ?? '';
  if (!isFormId(form)) return json({ error: 'not_found' }, 404);

  // 1. Same-origin JSON only (CSRF: cross-site pages cannot send this without a CORS preflight, which we never grant).
  if (!originAllowed(request)) return json({ error: 'forbidden' }, 403);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'unsupported_media_type' }, 415);
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > MAX_BODY) return json({ error: 'too_large' }, 413);

  // 2. Rate limits per (hashed) IP.
  const ip = hashIp(clientIp(request, clientAddress));
  const wait = hit({ key: `f:${ip}`, max: config.formRateMax, windowMs: 10 * 60_000 }) || hit({ key: `fd:${ip}`, max: 30, windowMs: 24 * 3600_000 });
  if (wait) { log('warn', 'rate limited', { form }); return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(wait) }); }

  // 3. Parse.
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // 4. Spam: honeypot + signed time token. Bots get a fake success so they don't adapt.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    log('info', 'honeypot triggered', { form });
    return json({ ok: true });
  }
  const tok = verifyToken(body._token);
  if (tok === 'too_fast' || tok === 'invalid') {
    log('info', 'token rejected', { form, reason: tok });
    return tok === 'too_fast' ? json({ ok: true }) : json({ error: 'invalid_token' }, 409);
  }
  if (tok !== 'ok') return json({ error: 'invalid_token' }, 409);

  // 5. Authoritative validation (same rules as the browser).
  const result = validateForm(form, body);
  if (!result.ok) return json({ error: 'validation', errors: result.errors }, 422);

  // 6. Content heuristics: never drop, but flag likely spam for the reader.
  const freeText = ['note', 'message', 'neighbourhoods'].map((k) => String(result.values[k] ?? '')).join(' ');
  const suspicious = (freeText.match(URL_RE)?.length ?? 0) > 2 || /<a\s|\[url=/i.test(freeText);

  // 7. Deliver.
  consumeToken(body._token as string);
  const submission = newSubmission(form, result.values, suspicious);
  try {
    const outcome = await deliver(submission);
    log('info', 'form submitted', { form, ref: submission.id, outcome });
    return json({ ok: true, ref: submission.id });
  } catch (e) {
    log('error', 'delivery and outbox both failed', { form, ref: submission.id, error: (e as Error).message.slice(0, 200) });
    return json({ error: 'delivery_failed' }, 503);
  }
};

export const ALL: APIRoute = () => json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
