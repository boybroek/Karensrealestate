import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, stat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = await mkdtemp(join(tmpdir(), 'kre-unit-'));
process.env.DATA_DIR = dir;
process.env.FORM_SECRET = 'unit-'.padEnd(40, 'y');
process.env.MAIL_TRANSPORT = 'smtp';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '9'; // nothing listens → connection refused
process.env.MAIL_FROM = 'a@example.test';
process.env.MAIL_TO = 'b@example.test';

const { issueToken, verifyToken, consumeToken } = await import('../../src/lib/server/token.ts');
const { buildEmail, esc } = await import('../../src/lib/server/email.ts');
const { deliver, newSubmission, retryOutbox, outboxSize } = await import('../../src/lib/server/deliver.ts');
const { hit } = await import('../../src/lib/server/ratelimit.ts');

test('tokens: signature, minimum age, expiry and replay', () => {
  const now = Date.now();
  const tok = issueToken(now);
  assert.equal(verifyToken(tok, now + 1000), 'too_fast');
  assert.equal(verifyToken(tok, now + 5000), 'ok');
  assert.equal(verifyToken(tok, now + 3 * 3600_000), 'expired');
  assert.equal(verifyToken(tok.slice(0, -2) + 'xx', now + 5000), 'invalid');
  assert.equal(verifyToken('a.b', now), 'invalid');
  assert.equal(verifyToken(42, now), 'invalid');
  consumeToken(tok, now + 5000);
  assert.equal(verifyToken(tok, now + 6000), 'reused');
});

test('rate limiter', () => {
  const lim = { key: 'unit', max: 2, windowMs: 1000 };
  assert.equal(hit(lim, 0), 0);
  assert.equal(hit(lim, 1), 0);
  assert.ok(hit(lim, 2) > 0);
  assert.equal(hit(lim, 1500), 0, 'window resets');
});

test('e-mail: escaped HTML, readable labels, no header injection', () => {
  const m = buildEmail('contact', { lang: 'en', name: 'Eve\r\nBcc: x@y.z', email: 'eve@example.nl', phone: '+31612345678', topic: 'let', message: '<img src=x onerror=alert(1)>' }, { id: 'abc', receivedAt: new Date('2026-11-13T10:00:00Z') });
  assert.ok(!m.subject.includes('\n') && !m.subject.includes('\r'));
  assert.ok(m.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!m.html.includes('<img src=x'));
  assert.match(m.text, /Onderwerp: Ik wil mijn woning verhuren/);
  assert.match(m.text, /Taal bezoeker: Engels/);
  assert.equal(esc(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;');
});

test('failed SMTP delivery is queued in the outbox (0600) and retried', async () => {
  const s = newSubmission('contact', { lang: 'nl', name: 'Test', email: 't@example.nl', topic: 'other', message: 'Hallo' }, false);
  assert.equal(await deliver(s), 'queued');
  const files = await readdir(join(dir, 'outbox'));
  assert.deepEqual(files, [`${s.id}.json`]);
  const st = await stat(join(dir, 'outbox', files[0]));
  if (process.platform !== 'win32') assert.equal(st.mode & 0o777, 0o600); // Windows kent geen POSIX-rechten
  const rec = JSON.parse(await readFile(join(dir, 'outbox', files[0]), 'utf8'));
  assert.deepEqual(rec.pending, ['email']);

  const r = await retryOutbox();
  assert.equal(r.left, 1, 'still failing → stays queued');
  assert.equal(await outboxSize(), 1);

  process.env.OUTBOX_RETENTION_DAYS = '0';
  const r2 = await retryOutbox();
  assert.equal(r2.dropped, 1, 'expired items are deleted');
  assert.equal(await outboxSize(), 0);
  await rm(dir, { recursive: true, force: true });
});
