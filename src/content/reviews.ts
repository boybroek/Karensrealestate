import type { Lang } from '../i18n/routes.ts';
import { DEMO } from './listings.ts';

/**
 * Client reviews ("Ervaringen").
 *
 * Only publish genuine reviews from real clients, with their permission, and
 * preferably verifiable (e.g. copied from Google Business Profile or Pararius).
 * Made-up reviews are misleading for visitors and against consumer law.
 * The "Ervaringen" section is hidden automatically while this list is empty.
 *
 * No Review/AggregateRating structured data is emitted on purpose: Google does
 * not show self-serving reviews of a LocalBusiness as rich results.
 */
export interface Review {
  quote: Record<Lang, string>;
  name: string;
  meta: Record<Lang, string>;
}

const REVIEWS: Review[] = [];

/** Texts from the design, used ONLY for KRE_DEMO_CONTENT=1 builds. */
const DEMO_REVIEWS: Review[] = [
  { quote: { nl: 'Binnen drie weken hadden we een prachtig appartement in het Statenkwartier. Fijn dat er echt werd meegedacht.', en: 'Within three weeks we had a beautiful apartment in Statenkwartier. It was great that they really thought along with us.' }, name: 'Sanne & Joris', meta: { nl: 'Huurders · Statenkwartier', en: 'Tenants · Statenkwartier' } },
  { quote: { nl: 'Als expat wist ik niet waar ik moest beginnen. Alles werd helder uitgelegd, ook in het Engels.', en: 'As an expat I didn’t know where to start. Everything was clearly explained, in English too.' }, name: 'Michael R.', meta: { nl: 'Expat · Benoordenhout', en: 'Expat · Benoordenhout' } },
  { quote: { nl: 'Snel een betrouwbare huurder gevonden en het contract was tot in de puntjes geregeld.', en: 'A reliable tenant was found quickly and the contract was arranged down to the last detail.' }, name: 'Familie de Vries', meta: { nl: 'Verhuurder · Scheveningen', en: 'Landlord · Scheveningen' } },
  { quote: { nl: 'Als student met een garantsteller is het lastig zoeken. Dankzij de begeleiding lukte het toch.', en: 'Finding a place as a student with a guarantor is hard. Thanks to the guidance it worked out.' }, name: 'Lotte', meta: { nl: 'Student · Centrum', en: 'Student · City Centre' } },
  { quote: { nl: 'Persoonlijk, bereikbaar en eerlijk advies over de huurprijs. Een aanrader.', en: 'Personal, approachable and honest advice on the rent. Highly recommended.' }, name: 'Peter van D.', meta: { nl: 'Verhuurder · Duinoord', en: 'Landlord · Duinoord' } },
];

export function getReviews(): Review[] {
  return DEMO ? DEMO_REVIEWS : REVIEWS;
}
