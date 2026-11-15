import type { Listing } from '../content/listings.ts';
import { site } from '../content/site.ts';
import { type Lang, type PageKey, path, t } from '../i18n/index.ts';

export interface Crumb { name: string; href: string }

export const abs = (base: URL | string, p: string) => new URL(p, base).href;

/** The business entity, referenced by @id from every page. Only verified facts. */
export function organization(origin: string) {
  const org: Record<string, unknown> = {
    '@type': ['RealEstateAgent', 'LocalBusiness'],
    '@id': `${origin}/#organization`,
    name: site.name,
    url: `${origin}/`,
    logo: { '@type': 'ImageObject', url: `${origin}/brand/logo.png`, width: 523, height: 170 },
    image: `${origin}/og/og-default.jpg`,
    telephone: site.phone.e164,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      postalCode: site.address.postalCode,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    // Exact position + map: strengthens the local signal (Google Maps / local pack).
    geo: { '@type': 'GeoCoordinates', latitude: site.map.lat, longitude: site.map.lon },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name}, ${site.address.street}, ${site.address.postalCode} ${site.address.city}`)}`,
    areaServed: site.areaServed.map((name) => ({ '@type': 'City', name })),
    founder: { '@type': 'Person', name: site.owner },
    knowsLanguage: ['nl', 'en'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: site.phone.e164,
      email: site.email,
      availableLanguage: ['Dutch', 'English'],
      areaServed: 'NL',
    },
  };
  if (site.kvk) org.identifier = { '@type': 'PropertyValue', propertyID: 'KvK', value: site.kvk };
  if (site.vat) org.vatID = site.vat;
  if (site.sameAs.length) org.sameAs = site.sameAs;
  return org;
}

export function website(origin: string) {
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}/`,
    name: site.name,
    publisher: { '@id': `${origin}/#organization` },
    inLanguage: ['nl-NL', 'en'],
  };
}

export function breadcrumbList(origin: string, crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(origin, c.href) })),
  };
}

export function webPage(origin: string, url: string, lang: Lang, title: string, description: string, crumbs?: Crumb[]) {
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: lang === 'nl' ? 'nl-NL' : 'en',
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#organization` },
    ...(crumbs && crumbs.length > 1 ? { breadcrumb: breadcrumbList(origin, crumbs) } : {}),
  };
}

export function service(origin: string, url: string, lang: Lang, name: string, serviceType: string, description: string) {
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name,
    serviceType,
    description,
    url,
    inLanguage: lang === 'nl' ? 'nl-NL' : 'en',
    provider: { '@id': `${origin}/#organization` },
    areaServed: site.areaServed.map((n) => ({ '@type': 'City', name: n })),
  };
}

export function faqPage(url: string, faq: readonly (readonly string[])[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
}

/** Home → page breadcrumb trail. */
export function crumbsFor(lang: Lang, key: PageKey): Crumb[] {
  const d = t(lang);
  const home = { name: d.nav.home, href: path('home', lang) };
  return key === 'home' ? [home] : [home, { name: d.nav[key], href: path(key, lang) }];
}

/** Rental listings as an ItemList of Accommodation (address, exact geo, size), each pointing at its card on the page. */
export function listingsSchema(url: string, listings: Listing[]) {
  return {
    '@type': 'ItemList',
    '@id': `${url}#listings`,
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Accommodation',
        '@id': `${url}#listing-${l.id}`,
        name: `${l.address}, ${l.city}`,
        url: l.url ?? `${url}#listing-${l.id}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: l.address,
          ...(l.postalCode ? { postalCode: l.postalCode } : {}),
          addressLocality: l.city,
          addressCountry: 'NL',
        },
        ...(l.lat && l.lon ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lon } } : {}),
        floorSize: { '@type': 'QuantitativeValue', value: l.area, unitCode: 'MTK' },
        numberOfBedrooms: l.bedrooms,
        containedInPlace: { '@type': 'Place', name: `${l.neighbourhood}, ${l.city}` },
      },
    })),
  };
}

/** Serialise JSON-LD safely for embedding in a <script> element. */
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
