import { createHmac } from 'node:crypto';
import { config } from '../src/lib/server/config.ts';
import { buildEmail } from '../src/lib/server/email.ts';
import { log } from '../src/lib/server/log.ts';
import type { OutboxRecord, SinkName, Submission } from '../src/lib/server/submission.ts';
import type { KV } from './types.ts';

/**
 * Delivery on Cloudflare Workers. Same sinks as the Node version (src/lib/server/deliver.ts):
 *   - email:   via the Resend HTTP API (Workers cannot use SMTP/nodemailer)
 *   - webhook: optional signed JSON POST to FORMS_WEBHOOK_URL
 * Failed sinks are stored in KV (key "outbox:<id>", expires after OUTBOX_RETENTION_DAYS)
 * and retried every 5 minutes by the cron trigger.
 *
 * MAIL_TRANSPORT=kv (development only) stores the rendered e-mail in KV ("devmail:<id>") instead of sending it.
 */
const env = (k: string) => (process.env[k] ?? '').trim();

async function sendEmail(s: Submission, kv?: KV) {
  const m = config.mail;
  const mail = buildEmail(s.form, s.values, { id: s.id, receivedAt: new Date(s.receivedAt), suspicious: s.suspicious });
  const message = {
    from: m.from || 'website@localhost',
    to: m.to,
    reply_to: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: { 'X-KRE-Form': s.form, 'X-KRE-Ref': s.id },
  };
  if (env('MAIL_TRANSPORT') === 'kv') {
    if (config.production) throw new Error('MAIL_TRANSPORT=kv is not allowed in production');
    if (!kv) throw new Error('KV binding KRE_KV missing');
    await kv.put(`devmail:${s.receivedAt}-${s.form}-${s.id}`, JSON.stringify(message), { expirationTtl: 7 * 86_400 });
    return;
  }
  const key = env('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `kre-${s.id}` },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`resend responded ${res.status}`);
}

async function sendWebhook(s: Submission) {
  const { url, secret } = config.webhook;
  if (!url) return;
  const body = JSON.stringify({ event: 'form.submitted', ...s });
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'KRE-Website/1.0' };
  if (secret) headers['X-KRE-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000), redirect: 'error' });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

const activeSinks = (): SinkName[] => (config.webhook.url ? ['email', 'webhook'] : ['email']);

async function runSinks(s: Submission, sinks: SinkName[], kv?: KV): Promise<SinkName[]> {
  const failed: SinkName[] = [];
  for (const name of sinks) {
    try { await (name === 'email' ? sendEmail(s, kv) : sendWebhook(s)); }
    catch (e) {
      failed.push(name);
      log('error', 'sink failed', { sink: name, form: s.form, ref: s.id, error: (e as Error).message.slice(0, 200) });
    }
  }
  return failed;
}

/** Seconds this item may still wait, counted from when it was received (so retries don't extend it). */
const secondsLeft = (rec: OutboxRecord) =>
  Math.round(config.outboxRetentionDays * 86_400 - (Date.now() - Date.parse(rec.submission.receivedAt)) / 1000);

async function writeOutbox(kv: KV, rec: OutboxRecord) {
  await kv.put(`outbox:${rec.submission.id}`, JSON.stringify(rec), { expirationTtl: Math.max(60, secondsLeft(rec)) });
}

/** Delivers a submission. Resolves to 'sent' or 'queued'; throws only if it could neither be sent nor queued. */
export function makeDeliver(kv?: KV) {
  return async (s: Submission): Promise<'sent' | 'queued'> => {
    const failed = await runSinks(s, activeSinks(), kv);
    if (!failed.length) return 'sent';
    if (!kv) throw new Error('delivery failed and no KV outbox is configured');
    await writeOutbox(kv, { submission: s, pending: failed, attempts: 1 });
    log('warn', 'submission queued in outbox', { form: s.form, ref: s.id, pending: failed.join(',') });
    return 'queued';
  };
}

/** Cron: retry everything in the outbox. Items expire automatically via the KV TTL. */
export async function retryOutbox(kv?: KV): Promise<{ sent: number; left: number }> {
  const result = { sent: 0, left: 0 };
  if (!kv) return result;
  const { keys } = await kv.list({ prefix: 'outbox:', limit: 100 });
  for (const { name } of keys) {
    const raw = await kv.get(name);
    if (!raw) continue;
    let rec: OutboxRecord;
    try { rec = JSON.parse(raw); } catch { await kv.delete(name); continue; }
    if (secondsLeft(rec) <= 0) {
      await kv.delete(name);
      log('error', 'outbox item expired and was deleted', { form: rec.submission.form, ref: rec.submission.id });
      continue;
    }
    const failed = await runSinks(rec.submission, rec.pending, kv);
    if (!failed.length) { await kv.delete(name); result.sent++; log('info', 'outbox item delivered', { ref: rec.submission.id }); }
    else { await writeOutbox(kv, { ...rec, pending: failed, attempts: rec.attempts + 1 }); result.left++; }
  }
  return result;
}

export async function outboxSize(kv?: KV): Promise<number> {
  if (!kv) return 0;
  return (await kv.list({ prefix: 'outbox:', limit: 1000 })).keys.length;
}
