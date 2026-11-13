/**
 * Structured logging (JSON lines on stdout/stderr) WITHOUT personal data:
 * never pass names, e-mail addresses, phone numbers, messages or IP addresses.
 */
type Level = 'info' | 'warn' | 'error';
export function log(level: Level, msg: string, meta: Record<string, string | number | boolean | undefined> = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
