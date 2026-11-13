/**
 * Central business information. Every page, the footer, structured data and
 * e-mails read from here, so the NAP (name/address/phone) is always consistent.
 *
 * Only facts supplied by the client are filled in. Empty values are omitted
 * from the site automatically; `npm run launch-check` lists what is missing.
 */
export const site = {
  name: 'Karens Real Estate',
  owner: 'Diana Karens',
  phone: {
    display: '06 - 24 50 61 05',
    e164: '+31624506105',
  },
  email: 'info@karensrealestate.nl',
  address: {
    street: 'Westduinweg 90',
    postalCode: '2583 EM',
    city: 'Den Haag',
    cityEn: 'The Hague',
    region: 'Zuid-Holland',
    country: 'NL',
  },
  /** Used for the OpenStreetMap embed on the contact page. */
  map: { lat: 52.0989, lon: 4.2662 },
  /** Chamber of Commerce number. REQUIRED before launch (legal requirement). */
  kvk: '',
  /** VAT number, optional. */
  vat: '',
  /** Profiles that unambiguously belong to the business (Google Business Profile, LinkedIn …). */
  sameAs: [] as string[],
  /** Listing portals shown in the footer. */
  partners: [
    { name: 'Pararius', href: 'https://www.pararius.nl/makelaars/den-haag/karens-real-estate' },
    { name: 'Funda', href: 'https://www.funda.nl/' },
    { name: 'Huurwoningen.nl', href: 'https://www.huurwoningen.nl/' },
  ],
  /** Office profile on Pararius, linked when there are no listings on the site. */
  parariusProfile: 'https://www.pararius.nl/makelaars/den-haag/karens-real-estate',
  areaServed: ['Den Haag', 'Scheveningen', 'Voorburg', 'Rijswijk'],
  neighbourhoods: [
    'Statenkwartier', 'Centrum', 'Scheveningen', 'Duinoord', 'Regentessekwartier', 'Archipelbuurt',
    'Zeeheldenkwartier', 'Benoordenhout', 'Bezuidenhout', 'Voorburg', 'Rijswijk',
  ],
} as const;

export const mapsDirections = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const osmEmbed = (lat: number, lon: number, dx = 0.006, dy = 0.0035) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - dx}%2C${lat - dy}%2C${lon + dx}%2C${lat + dy}&layer=mapnik&marker=${lat}%2C${lon}`;

export const osmLink = (lat: number, lon: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

export const fullAddress = `${site.address.street}, ${site.address.postalCode} ${site.address.city}`;
