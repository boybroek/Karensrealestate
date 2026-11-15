import { createHmac } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from './config.ts';
import { buildEmail } from './email.ts';
import { log } from './log.ts';
import type { OutboxRecord, SinkName, Submission } from './submission.ts';

export { newSubmission, type Submission } from './submission.ts';

/**
 * Delivery pipeline. A submission is handed to every configured "sink":
 *   - email   (always): notification to MAIL_TO via SMTP
 *   - webhook (optional): signed JSON POST to FORMS_WEBHOOK_URL — the hook for a future CRM, Zapier/Make, etc.
 * If a sink fails, the submission is written to an outbox on disk (permissions 0600)
 * and retried every 5 minutes. Outbox files are deleted as soon as delivery succeeds,
 * and after OUTBOX_RETENTION_DAYS at the latest. Nothing is stored when delivery works.
 * (The Cloudflare Worker has its own variant of this in worker/deliver.ts.)
 */

let transporter: Transporter | null = null;
function getTransport(): Transporter {
  if (transporter) return transporter;
  const m = config.mail;
  if (m.transport === 'file') {
    if (config.production) throw new Error('MAIL_TRANSPORT=file is not allowed in production');
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else {
    transporter = nodemailer.createTransport({
      host: m.host, port: m.port, secure: m.secure,
      auth: m.user ? { user: m.user, pass: m.pass } : undefined,
      requireTLS: !m.secure,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
    });
  }
  return transporter;
}

async function sendEmail(s: Submission) {
  const m = config.mail;
  const mail = buildEmail(s.form, s.values, { id: s.id, receivedAt: new Date(s.receivedAt), suspicious: s.suspicious });
  const info = await getTransport().sendMail({
    from: m.from || 'website@localhost',
    to: m.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: { 'X-KRE-Form': s.form, 'X-KRE-Ref': s.id },
  });
  if (m.transport === 'file') {
    // Development: write the rendered message to data/dev-mail for inspection.
    const dir = join(config.dataDir, 'dev-mail');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(join(dir, `${s.receivedAt.replace(/[:.]/g, '-')}-${s.form}-${s.id}.json`), String(info.message), { mode: 0o600 });
  }
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

const SINKS: Record<SinkName, (s: Submission) => Promise<void>> = { email: sendEmail, webhook: sendWebhook };
const activeSinks = (): SinkName[] => (config.webhook.url ? ['email', 'webhook'] : ['email']);

async function runSinks(s: Submission, sinks: SinkName[]): Promise<SinkName[]> {
  const failed: SinkName[] = [];
  for (const name of sinks) {
    try { await SINKS[name](s); }
    catch (e) {
      failed.push(name);
      log('error', 'sink failed', { sink: name, form: s.form, ref: s.id, error: (e as Error).message.slice(0, 200) });
    }
  }
  return failed;
}

const outboxDir = () => join(config.dataDir, 'outbox');

async function writeOutbox(rec: OutboxRecord) {
  const dir = outboxDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, `${rec.submission.id}.json`);
  await writeFile(file + '.tmp', JSON.stringify(rec), { mode: 0o600 });
  await rename(file + '.tmp', file);
}

/** Delivers a submission. Resolves to 'sent' or 'queued'; throws only if it could neither be sent nor queued. */
export async function deliver(s: Submission): Promise<'sent' | 'queued'> {
  const failed = await runSinks(s, activeSinks());
  if (!failed.length) return 'sent';
  await writeOutbox({ submission: s, pending: failed, attempts: 1 });
  log('warn', 'submission queued in outbox', { form: s.form, ref: s.id, pending: failed.join(',') });
  return 'queued';
}

let retrying = false;
export async function retryOutbox(): Promise<{ sent: number; left: number; dropped: number }> {
  const result = { sent: 0, left: 0, dropped: 0 };
  if (retrying) return result;
  retrying = true;
  try {
    let files: string[] = [];
    try { files = (await readdir(outboxDir())).filter((f) => f.endsWith('.json')); } catch { return result; }
    const maxAge = config.outboxRetentionDays * 86_400_000;
    for (const f of files) {
      const file = join(outboxDir(), f);
      let rec: OutboxRecord;
      try { rec = JSON.parse(await readFile(file, 'utf8')); } catch { continue; }
      if (Date.now() - Date.parse(rec.submission.receivedAt) > maxAge) {
        await rm(file, { force: true });
        result.dropped++;
        log('error', 'outbox item expired and was deleted', { form: rec.submission.form, ref: rec.submission.id });
        continue;
      }
      const failed = await runSinks(rec.submission, rec.pending);
      if (!failed.length) { await rm(file, { force: true }); result.sent++; log('info', 'outbox item delivered', { ref: rec.submission.id }); }
      else { await writeOutbox({ ...rec, pending: failed, attempts: rec.attempts + 1 }); result.left++; }
    }
  } finally { retrying = false; }
  return result;
}

export async function outboxSize(): Promise<number> {
  try { return (await readdir(outboxDir())).filter((f) => f.endsWith('.json')).length; } catch { return 0; }
}

let timer: NodeJS.Timeout | null = null;
/** Starts the background retry loop (idempotent). Called from server.mjs and lazily by the API. */
export function startOutboxWorker() {
  if (timer) return;
  timer = setInterval(() => { retryOutbox().catch((e) => log('error', 'outbox retry crashed', { error: String(e).slice(0, 200) })); }, 5 * 60 * 1000);
  timer.unref();
}
