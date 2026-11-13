import type { ImageMetadata } from 'astro';

/**
 * Site photography. Drop a file in src/assets/photos/ with one of these base
 * names (jpg, jpeg, png, webp or avif) and it is picked up automatically,
 * resized and converted to AVIF/WebP at build time:
 *
 *   hero.*       – home page hero (portrait 4:5, min. 1200×1500 px)
 *   over-ons.*   – portrait of Diana Karens or the office (min. 1200×1500 px)
 *   verhuren.*   – letting page, e.g. styled living room (5:4, min. 1500×1200 px)
 *
 * Until a photo is supplied, a designed illustration is shown in its place.
 */
export type PhotoKey = 'hero' | 'over-ons' | 'verhuren';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });

export function getPhoto(key: PhotoKey): ImageMetadata | undefined {
  for (const [file, mod] of Object.entries(files)) {
    const base = file.split('/').pop()!.replace(/\.[^.]+$/, '');
    if (base === key) return mod.default;
  }
  return undefined;
}
