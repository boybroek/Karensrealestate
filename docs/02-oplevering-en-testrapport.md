# Oplevering & testrapport — 13 november 2026

## Wat er is gebouwd

**22 pagina's:**
- 10 per taal: home, aanhuur, verhuren, vastgoedbeheer (nieuw), expats (nieuw), woningaanbod, over ons, contact, privacyverklaring en cookiebeleid
- een tweetalige 404-pagina
- sitemap.xml en robots.txt

**3 werkende formulieren:**
- woningzoekopdracht: 3 stappen, met een schakelaar student/werkende
- woning aanmelden: 2 stappen
- contactformulier

De formulieren worden zowel in de browser als op de server gevalideerd en sturen een e-mailnotificatie. Lukt dat niet, dan gaat de aanvraag naar een outbox met retry. Een optionele webhook maakt een CRM-koppeling mogelijk.

### Afwijkingen van het ontwerp (bewust, met reden)

| Ontwerp | Oplevering | Reden |
|---|---|---|
| Blauw "gordijn" tussen pagina's (±1,4 s) | Native fade (View Transitions) | Echte URL's per pagina voor SEO; geen vertraging bij elke klik. Het ontwerp bood zelf "Fade" als alternatief. |
| Horizontaal scrollende navigatie op mobiel | Hamburgermenu met CTA's en een belknop | Beter te bedienen; contact is altijd binnen één tik bereikbaar. |
| Lange aanhuur- en verhuurformulieren op één pagina | Stappen met terug/volgende en een voortgangsindicator | Gevraagd in de briefing; minder afhakers op mobiel. Velden, chips en keuzelijsten zijn gelijk gebleven. |
| Kaart op contactpagina direct geladen | Laden na een klik | Privacy (geen IP-adressen naar derden zonder actie) en snelheid. |
| Foto-placeholders | Lijnillustratie van Haagse gevels in huisstijl, totdat er foto's zijn | Geen placeholders live. |
| 5 voorbeeldreviews, 6 voorbeeldwoningen | Verborgen zolang er geen echte data is (wel te zien in de demo-build) | Verzonnen reviews en woningen zijn misleidend. |
| Link "Algemene voorwaarden" | Weggelaten | Er is geen tekst aangeleverd. |
| Vlaggen via flagcdn.com, Google Fonts | Lokaal (inline SVG, zelf gehoste fonts) | AVG en snelheid. |
| — | Extra: dienstenblok op de home, FAQ's, breadcrumbs, wijkinformatie op *Woningaanbod* | Interne links, lokale SEO en zoekintentie. |

## Testresultaten

| Test | Resultaat |
|---|---|
| TypeScript/Astro-typecheck (`npm run check`) | 0 fouten |
| Unit-tests (`npm test`): validatie (telefoon, e-mail, postcode, bedragen, datums), tokens, rate limiter, e-mail-escaping, outbox bij SMTP-storing | 13/13 geslaagd |
| End-to-end (`npm run test:e2e`, Playwright, productiebuild) | 10/10 geslaagd |
| `npm audit` (alle en alleen productie-afhankelijkheden) | 0 kwetsbaarheden |
| Productiestart zonder configuratie | Stopt met een duidelijke melding (exitcode 1) |
| Runtime met alleen productie-afhankelijkheden + canonical-host-redirect | Werkt (200 / 301) |

**Wat de end-to-end-tests controleren:**
- Alle 20 pagina's geven status 200 en hebben:
  - een unieke titel (max. 70 tekens) en een unieke meta description (70–175 tekens)
  - een canonical en hreflang (nl-NL, en, x-default)
  - precies één h1 en geldige JSON-LD
  - alt-teksten bij afbeeldingen
  - geen consolefouten
- Er zijn geen gebroken interne links of assets, en elke pagina is via een interne link bereikbaar.
- Sitemap (20 URL's met hreflang), robots.txt, een echte 404-status, 301-redirects voor oude/korte URL's en de trailing slash.
- Security-headers (CSP, nosniff, frame-ancestors, Referrer- en Permissions-Policy). Er worden **geen cookies** gezet. Statische assets zijn `immutable` gecachet.
- Taalwissel naar de vertaalde pagina, en terug.
- Mobiel: geen horizontaal scrollen; het menu opent, navigeert en sluit met Escape.
- **Contactformulier:** foutmeldingen per veld, focus op het eerste fout veld, verzending, de inhoud van de e-mail, Reply-To en HTML-escaping (een XSS-poging wordt onschadelijk weergegeven).
- **Zoekopdracht:** het wisselen tussen student en werkende (verborgen velden worden niet verstuurd), blokkeren van een volgende stap bij een fout, terug en vooruit met behoud van invoer, keuzelijsten (enkel- en meerkeuze), toestemming, verzending en de inhoud van de e-mail.
- Een expat-link vult het formulier vooraf in. Het verhuurformulier (EN) controleert de postcode en het verplichte telefoonnummer.
- **API:**
  - geen of een vreemde origin → 403
  - geen JSON → afgewezen
  - een ontbrekend of vervalst token → 409
  - een te snelle bot of de honeypot → stil "ok" zonder mail
  - een serverfout bij validatie → 422 per veld
  - een token hergebruiken → 409
  - GET → 405
  - te veel verzoeken → 429
- **Privacy:** de serverlogs bevatten geen ingevulde persoonsgegevens.

**Lighthouse (mobiel profiel, lokale productieserver zonder compressie):**

| Pagina | Performance | Toegankelijkheid | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 | 2,4 s | 0,003 | 0 ms |
| `/aanhuurmakelaar-den-haag/` | 98 | 99 → opgelost* | 100 | 100 | 2,3 s | 0 | 50 ms |
| `/en/contact/` | 98 | 100 | 100 | 100 | 2,3 s | 0 | 0 ms |

\* De melding over de heading-volgorde is opgelost. Lighthouse heeft deze pagina daarna niet opnieuw gemeten. De resterende suggestie, tekstcompressie, wordt in productie door de reverse proxy gedaan (zie `Caddyfile`). Lighthouse draaide met gesimuleerde mobiele throttling.

## Niet getest / beperkingen

- **Echte SMTP-verzending.** Er zijn geen SMTP-gegevens, dus getest is met de bestandstransport en met een bewust onbereikbare SMTP-server (outbox). Stuur na de livegang één testaanvraag per formulier.
- **Docker-image.** In de testomgeving draaide geen Docker-daemon. De runtimestap is nagebootst (alleen productie-afhankelijkheden, `dist/`, `server.mjs`) en die werkt.
- **Google Rich Results Test / Search Console.** Daarvoor is het live domein nodig. De JSON-LD is lokaal gecontroleerd op geldige JSON en de juiste opbouw.
- **Juridische toetsing.** De privacyverklaring, het cookiebeleid en de FAQ-teksten over huurwetgeving zijn zorgvuldig en algemeen geformuleerd. Laat ze voor publicatie door de klant (en eventueel een jurist) controleren.
