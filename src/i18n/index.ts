import nl, { type Dict } from './nl.ts';
import en from './en.ts';
import { type Lang, type PageKey, ROUTES } from './routes.ts';

export { LANGS, DEFAULT_LANG, ROUTES, NAV, path, type Lang, type PageKey } from './routes.ts';
export type { Dict };

const DICTS: Record<Lang, Dict> = { nl, en };
export const t = (lang: Lang): Dict => DICTS[lang];

/** Replace `{name}` placeholders. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

export const otherLang = (lang: Lang): Lang => (lang === 'nl' ? 'en' : 'nl');

/** All URLs of a page, used for hreflang alternates. */
export const alternates = (key: PageKey) => ROUTES[key];

export const htmlLang = (lang: Lang) => (lang === 'nl' ? 'nl-NL' : 'en');
