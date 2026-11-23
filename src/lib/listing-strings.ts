import { type Lang, t } from '../i18n/index.ts';
import type { CardStrings } from './listing-view.ts';

/** The card strings for one language (also embedded in the page for the live script). */
export function cardStrings(lang: Lang): CardStrings {
  const d = t(lang).aanbod;
  return {
    locale: lang === 'nl' ? 'nl-NL' : 'en-GB',
    cityEn: lang === 'en',
    status: d.status,
    available: d.available,
    pm: d.pm,
    bed: d.bed,
    studio: d.studio,
    onRequest: d.onRequest,
    mapOf: d.mapOf,
  };
}
