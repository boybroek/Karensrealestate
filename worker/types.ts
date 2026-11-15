// Minimal Cloudflare Workers types used by this Worker (avoids a dependency on @cloudflare/workers-types).

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export interface Env {
  /** The static Astro build (dist/), see "assets" in wrangler.jsonc. */
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Outbox for undeliverable submissions + used form tokens. */
  KRE_KV?: KV;
}

export interface Ctx { waitUntil(p: Promise<unknown>): void }
