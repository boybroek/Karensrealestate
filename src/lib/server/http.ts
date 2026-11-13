import { config } from './config.ts';

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra },
  });

/** Client IP, honouring X-Forwarded-For only for the configured number of trusted proxies. */
export function clientIp(request: Request, fallback: string): string {
  const hops = config.trustProxyHops;
  if (hops > 0) {
    const xff = (request.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (xff.length >= hops) return xff[xff.length - hops];
  }
  return fallback || 'unknown';
}

/** CSRF / cross-site protection: the browser must send an Origin we serve. */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const self = new URL(request.url).origin;
  const allowed = new Set([self, ...config.allowedOrigins]);
  if (!config.production) { allowed.add('http://localhost:4321'); allowed.add('http://127.0.0.1:4321'); }
  return allowed.has(origin.replace(/\/$/, ''));
}
