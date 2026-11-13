export const LANGS = ['nl', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'nl';

/** Every page of the site, with its URL per language. Single source of truth for links, hreflang and the sitemap. */
export const ROUTES = {
  home: { nl: '/', en: '/en/' },
  aanhuur: { nl: '/aanhuurmakelaar-den-haag/', en: '/en/rental-agent-the-hague/' },
  verhuren: { nl: '/verhuurmakelaar-den-haag/', en: '/en/letting-agent-the-hague/' },
  beheer: { nl: '/vastgoedbeheer-den-haag/', en: '/en/property-management-the-hague/' },
  expats: { nl: '/expats/', en: '/en/expat-housing-the-hague/' },
  aanbod: { nl: '/woningaanbod/', en: '/en/rental-listings/' },
  over: { nl: '/over-ons/', en: '/en/about-us/' },
  contact: { nl: '/contact/', en: '/en/contact/' },
  privacy: { nl: '/privacyverklaring/', en: '/en/privacy-statement/' },
  cookies: { nl: '/cookiebeleid/', en: '/en/cookie-policy/' },
} as const satisfies Record<string, Record<Lang, string>>;

export type PageKey = keyof typeof ROUTES;

export const path = (key: PageKey, lang: Lang) => ROUTES[key][lang];

/** Pages listed in the main navigation, in design order. */
export const NAV: PageKey[] = ['home', 'aanhuur', 'verhuren', 'aanbod', 'over', 'contact'];

/** Pages that should not appear in the sitemap. */
export const SITEMAP_PRIORITY: Partial<Record<PageKey, number>> = {
  home: 1.0, aanhuur: 0.9, verhuren: 0.9, beheer: 0.8, expats: 0.8, aanbod: 0.8, over: 0.6, contact: 0.7,
  privacy: 0.2, cookies: 0.2,
};
