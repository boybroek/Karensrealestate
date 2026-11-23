/**
 * Live listings: fetches the current offer from the listings API worker and re-renders a grid
 * when it differs from what was built into the page. The page works without this (static cards);
 * on any error the static cards simply stay.
 *
 * Safe by construction: data is only ever written with textContent / setAttribute, never as
 * HTML; every field is type-checked; photo URLs must be on the Pararius Office CDN.
 */
import type { Listing, ListingStatus } from '../content/listings.ts';
import { cardView, matchListing, photoSrc, photoSrcset, type CardStrings } from '../lib/listing-view.ts';

const PHOTO_PREFIX = 'https://pararius-office-prod.global.ssl.fastly.net/';
const STATUSES: ListingStatus[] = ['avail', 'new', 'option', 'rented'];

interface Payload { version: string; listings: Listing[] }

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function clean(raw: unknown): Listing | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = str(r.id, 64);
  const status = str(r.status, 10) as ListingStatus;
  if (!/^[A-Za-z0-9-]+$/.test(id) || !STATUSES.includes(status)) return null;
  const photo = str(r.photo, 500);
  return {
    id,
    address: str(r.address, 100),
    postalCode: str(r.postalCode, 8) || undefined,
    city: str(r.city, 60),
    neighbourhood: str(r.neighbourhood, 60),
    lat: num(r.lat) ?? undefined,
    lon: num(r.lon) ?? undefined,
    rent: num(r.rent),
    area: num(r.area),
    bedrooms: num(r.bedrooms) ?? 0,
    status,
    available: str(r.available, 10),
    photoUrl: photo.startsWith(PHOTO_PREFIX) ? photo : undefined,
  };
}

const requests = new Map<string, Promise<Payload | null>>();
function load(url: string): Promise<Payload | null> {
  let p = requests.get(url);
  if (!p) {
    p = fetch(url, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { version?: unknown; listings?: unknown } | null) =>
        b && typeof b.version === 'string' && Array.isArray(b.listings)
          ? { version: b.version, listings: b.listings.map(clean).filter((l): l is Listing => l !== null) }
          : null)
      .catch(() => null);
    requests.set(url, p);
  }
  return p;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

interface Ui { photo: string; map: string; viewToggle: string; onMaps: string; newWindow: string; all: string }

function card(l: Listing, s: CardStrings, ui: Ui, root: HTMLElement): HTMLElement {
  const v = cardView(l, s);
  const wrap = el('div', { id: v.id, 'data-listing': '', 'data-wijk': l.neighbourhood, 'data-reveal': '0', class: 'is-in' });
  const art = el('article', { class: `lcard${l.status === 'rented' ? ' lcard--rented' : ''}`, 'aria-labelledby': `${v.id}-t` });
  const media = el('div', { class: 'lcard__media' });
  if (l.photoUrl) {
    const box = el('div', { class: 'art ratio-4-3' });
    box.append(el('img', {
      src: photoSrc(l.photoUrl, 720), srcset: photoSrcset(l.photoUrl), sizes: '(min-width: 1100px) 420px, 100vw',
      alt: v.alt, width: '720', height: '540', loading: 'lazy', decoding: 'async',
    }));
    media.append(box);
  } else {
    const tpl = root.querySelector<HTMLTemplateElement>('template[data-art]');
    const ill = tpl?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (ill) { ill.querySelector('svg')?.setAttribute('aria-label', v.alt); media.append(ill); }
  }
  if (v.mapSrc) media.append(el('div', { class: 'lcard__map', 'data-map-src': v.mapSrc, 'data-map-title': v.mapTitle }));
  media.append(el('span', { class: `lcard__status lcard__status--${l.status}` }, v.status));
  if (v.mapSrc) {
    const tg = el('div', { class: 'lcard__toggle', role: 'group', 'aria-label': ui.viewToggle });
    tg.append(el('button', { type: 'button', 'aria-pressed': 'true', 'data-view': 'photo' }, ui.photo));
    tg.append(el('button', { type: 'button', 'aria-pressed': 'false', 'data-view': 'map' }, ui.map));
    media.append(tg);
  }
  const body = el('div', { class: 'lcard__body' });
  const h = (root.dataset.heading === 'h2' ? 'h2' : 'h3') as 'h2' | 'h3';
  body.append(el(h, { class: 'lcard__t', id: `${v.id}-t` }, v.title));
  body.append(el('p', { class: 'lcard__loc' }, v.loc));
  const row = el('div', { class: 'lcard__row' });
  const price = el('span', { class: 'lcard__price' }, `${v.price} `);
  if (v.perMonth) price.append(el('span', {}, v.perMonth));
  row.append(price, el('span', { class: 'lcard__meta' }, v.meta));
  const foot = el('div', { class: 'lcard__foot' });
  const a = el('a', { href: v.mapsUrl, target: '_blank', rel: 'noopener' }, ui.onMaps);
  a.append(el('span', { class: 'visually-hidden' }, ` ${ui.newWindow}`));
  foot.append(a);
  if (root.dataset.availability) foot.append(el('span', { class: 'lcard__avail' }, v.avail));
  body.append(row, foot);
  art.append(media, body);
  wrap.append(art);
  return wrap;
}

function select(root: HTMLElement, all: Listing[]): Listing[] {
  const limit = Number(root.dataset.limit) || 0;
  let list = all;
  if (root.dataset.select === 'featured') list = all.filter((l) => l.status !== 'rented');
  if (root.dataset.select === 'area' && root.dataset.match) {
    const m = JSON.parse(root.dataset.match) as { wijken: string[]; cities: string[] };
    list = all.filter((l) => matchListing(m, l));
  }
  return limit ? list.slice(0, limit) : list;
}

function render(root: HTMLElement, list: Listing[]) {
  const s = JSON.parse(root.dataset.strings!) as CardStrings;
  const ui = JSON.parse(root.dataset.ui!) as Ui;
  const grid = root.querySelector<HTMLElement>('[data-grid]')!;
  grid.replaceChildren(...list.map((l) => card(l, s, ui, root)));
  grid.hidden = list.length === 0;
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  if (empty) empty.hidden = list.length > 0;

  const bar = root.querySelector<HTMLElement>('[data-filterbar]');
  if (bar) {
    const wijken = Array.from(new Set(list.map((l) => l.neighbourhood)));
    const chips = bar.querySelector('.chips')!;
    const allBtn = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'true', 'data-filter': 'all' }, ui.all);
    chips.replaceChildren(allBtn, ...wijken.map((w) => el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-filter': w }, w)));
    bar.hidden = wijken.length < 2;
    const c = bar.querySelector('[data-count]');
    if (c) c.textContent = `${list.length} ${list.length === 1 ? root.dataset.one : root.dataset.many}`;
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-listings][data-live]')) {
  load(root.dataset.live!).then((data) => {
    if (!data || data.version === root.dataset.version) return; // unchanged since the build
    render(root, select(root, data.listings));
    root.dataset.version = data.version;
  });
}
