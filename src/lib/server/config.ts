import { randomBytes } from 'node:crypto';

/**
 * Runtime configuration from environment variables (read at request time, never bundled into the client).
 * See .env.example for documentation of every variable.
 */
const env = (k: string) => (process.env[k] ?? '').trim();

let devSecret: string | null = null;

export const config = {
  get production() { return env('NODE_ENV') === 'production'; },
  get formSecret(): string {
    const s = env('FORM_SECRET');
    if (s.length >= 32) return s;
    if (this.production) throw new Error('FORM_SECRET must be set (min. 32 characters) in production');
    return (devSecret ??= randomBytes(32).toString('hex'));
  },
  /** Origins allowed to POST forms (CSRF protection). */
  get allowedOrigins(): string[] {
    const list = [env('SITE_URL') || 'https://www.karensrealestate.nl', ...env('ALLOWED_ORIGINS').split(',')]
      .map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
    return list;
  },
  /** Number of reverse proxies in front of the app whose X-Forwarded-For entry can be trusted. */
  get trustProxyHops() { return Math.max(0, Number(env('TRUST_PROXY_HOPS') || 0)); },
  get mail() {
    return {
      transport: env('MAIL_TRANSPORT') || 'smtp', // smtp | file (development only)
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT') || 587),
      secure: env('SMTP_SECURE') === 'true',
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
      from: env('MAIL_FROM'),
      to: env('MAIL_TO').split(',').map((s) => s.trim()).filter(Boolean),
    };
  },
  get webhook() { return { url: env('FORMS_WEBHOOK_URL'), secret: env('FORMS_WEBHOOK_SECRET') }; },
  /** Max form submissions per IP per 10 minutes (default 5). */
  get formRateMax() { return Math.max(1, Number(env('FORM_RATE_LIMIT') || 5)); },
  get dataDir() { return env('DATA_DIR') || './data'; },
  /** Days a failed submission may wait in the outbox before it is deleted. */
  get outboxRetentionDays() { return Number(env('OUTBOX_RETENTION_DAYS') || 14); },
};

/** Problems that make the form backend unusable; checked at startup by server.mjs. */
export function configProblems(): string[] {
  const p: string[] = [];
  if (env('FORM_SECRET').length < 32) p.push('FORM_SECRET (min. 32 tekens)');
  const m = config.mail;
  if (m.transport === 'smtp') {
    if (!m.host) p.push('SMTP_HOST');
    if (!m.from) p.push('MAIL_FROM');
  }
  if (!m.to.length) p.push('MAIL_TO');
  if (!env('SITE_URL')) p.push('SITE_URL');
  return p;
}
