import type { APIRoute } from 'astro';
import { listingsFingerprint, listingSource } from '../content/listings.ts';

/**
 * Fingerprint of the listings in this build, e.g. "pararius-office 3f9c0a1b2d4e5f60".
 * Used by .github/workflows/woningaanbod.yml to decide whether a rebuild is needed.
 */
export const GET: APIRoute = async () =>
  new Response(`${listingSource()} ${await listingsFingerprint()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
