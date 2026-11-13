// Generates favicons, the web manifest icons and the default Open Graph image
// from the supplied logo (src/assets/brand). Run: node scripts/generate-brand-assets.mjs
import sharp from 'sharp';
import { writeFile, copyFile } from 'node:fs/promises';

const NAVY = '#043a63';
const logo = 'src/assets/brand/logo.png';
const logoWhite = 'src/assets/brand/logo-white.png';

// The house-and-key mark occupies the left part of the logo.
const mark = await sharp(logo).extract({ left: 0, top: 0, width: 150, height: 170 }).png().toBuffer();
const markWhite = await sharp(logoWhite).extract({ left: 0, top: 0, width: 150, height: 170 }).png().toBuffer();

async function icon(size, out, { bg = '#ffffff', white = false, pad = 0.14 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const m = await sharp(white ? markWhite : mark).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: m, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out);
}

await icon(180, 'public/apple-touch-icon.png');
await icon(192, 'public/icon-192.png');
await icon(512, 'public/icon-512.png');
await icon(512, 'public/icon-maskable-512.png', { bg: NAVY, white: true, pad: 0.22 });

// favicon.ico (PNG-in-ICO, 32×32)
const png32 = await sharp(mark).resize({ width: 32, height: 32, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png32.length, 14); header.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([header, png32]));

// SVG favicon embedding the mark (scales crisply in tabs).
const b64 = (await sharp(mark).resize({ height: 128 }).png().toBuffer()).toString('base64');
await writeFile('public/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image href="data:image/png;base64,${b64}" x="7" y="0" width="113" height="128"/></svg>\n`);

// Open Graph image 1200×630: white logo on brand navy.
const ogLogo = await sharp(logoWhite).resize({ width: 760 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: NAVY } })
  .composite([{ input: ogLogo, gravity: 'center' }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile('public/og/og-default.jpg');

// Stable logo URL for structured data.
await copyFile(logo, 'public/brand/logo.png');

await writeFile('public/site.webmanifest', JSON.stringify({
  name: 'Karens Real Estate', short_name: 'Karens RE', start_url: '/', display: 'browser',
  background_color: '#f8f7f4', theme_color: NAVY,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');
console.log('brand assets generated');
