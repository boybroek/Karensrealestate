import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.ts';

/**
 * Signed form tokens ("time trap"). The browser fetches one when the visitor
 * starts filling in a form. A submission is only accepted when the token
 * - has a valid HMAC signature (cannot be forged without FORM_SECRET),
 * - is at least MIN_AGE old (bots submit instantly),
 * - is not older than MAX_AGE,
 * - has not been used before (replay protection).
 * Bots that POST straight to the endpoint without loading the page fail all checks.
 */
export const MIN_AGE_MS = 3_000;
export const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const sign = (payload: string) => createHmac('sha256', config.formSecret).update(payload).digest('base64url');

export function issueToken(now = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(12).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

const used = new Map<string, number>(); // nonce → expiry

export type TokenResult = 'ok' | 'invalid' | 'too_fast' | 'expired' | 'reused';

export function verifyToken(token: unknown, now = Date.now()): TokenResult {
  if (typeof token !== 'string' || token.length > 200) return 'invalid';
  const parts = token.split('.');
  if (parts.length !== 3) return 'invalid';
  const [ts, nonce, sig] = parts;
  const expected = Buffer.from(sign(`${ts}.${nonce}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'invalid';
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued)) return 'invalid';
  const age = now - issued;
  if (age < MIN_AGE_MS) return 'too_fast';
  if (age > MAX_AGE_MS) return 'expired';
  for (const [n, exp] of used) if (exp < now) used.delete(n);
  if (used.has(nonce)) return 'reused';
  return 'ok';
}

/** Mark a token as consumed after a successful submission. */
export function consumeToken(token: string, now = Date.now()) {
  const nonce = token.split('.')[1];
  if (nonce) used.set(nonce, now + MAX_AGE_MS);
}
