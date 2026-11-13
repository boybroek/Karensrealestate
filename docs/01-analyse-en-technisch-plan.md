# Fase 1 — Technische analyse & architectuurplan

## 1. Wat er is aangeleverd

| Bestand | Inhoud |
|---|---|
| `Karens Real Estate.dc.html` (v2, 95 KB) | Meest recente ontwerp. Tweetalig (NL/EN), 6 pagina's, drie formulieren, carrousel met ervaringen, woningaanbod met filter en kaart. |
| `Karens Real Estate v1.dc.html` (71 KB) | Eerdere versie. Alleen Nederlands, font *Hanken Grotesk*, persoonlijker geschreven vanuit "Diana", eenvoudigere formulieren (chips in plaats van keuzelijsten), geen ervaringen-sectie. |
| `support.js` (69 KB) | Runtime van de ontwerptool ("dc-runtime"): rendert de templates met React in de browser. Is geen productiecode. |
| `assets/logo.png`, `assets/logo-white.png` | Logo (523×170 px, PNG), donkerblauw en wit. `uploads/logo-…png` is een kopie van `logo.png`. |
| `.thumbnail` | Voorvertoning (WebP) van de ervaringen-carrousel. |

**Er zijn geen foto's aangeleverd.** Alle beeldvlakken in het ontwerp zijn gestreepte placeholders met een omschrijving ("hero-foto — karakteristieke Haagse straat", "portret", "professionele woningfotografie").

## 2. Gebruikte technologie in het ontwerp

- Eén HTML-bestand per versie met een eigen templatetaal (`{{ }}`, `<sc-if>`, `<sc-for>`) die in de browser door React wordt gerenderd (client-side rendering).
- Alle opmaak staat als inline `style`-attributen.
- Navigatie is een interne state (`page`), dus **er zijn geen URL's per pagina**. Zoekmachines zien één lege pagina.
- Taalwissel via `localStorage`, dus ook **geen aparte URL per taal**.
- Externe afhankelijkheden: Google Fonts, flagcdn.com (vlaggetjes), OpenStreetMap (kaarten), Google Maps-links.

## 3. Inventaris van de functionaliteit

| Onderdeel | Gedrag in het ontwerp | Status |
|---|---|---|
| Header | Logo (klikbaar), 6 navigatie-items, 2 CTA's, NL/EN-vlaggen | Werkt alleen in de ontwerptool |
| Paginaovergang | Blauw "gordijn" met logo (±1,4 s) of fade | Visueel effect |
| Home | Hero, twee keuzetegels (zoeken/verhuren), uitgelicht aanbod, over ons, expats, ervaringen-carrousel | Inhoud deels placeholder |
| Aanhuur | Stappen 01–04 en een zoekopdrachtformulier met een student/werkende-schakelaar, keuzechips, keuzelijsten en contactgegevens | **Formulier verstuurt niets** (`preventDefault` en daarna "Bedankt") |
| Verhuren | Hero, processtappen en een aanmeldformulier voor de woning | **Verstuurt niets** |
| Woningaanbod | 6 voorbeeldwoningen, filter op wijk, wisselen tussen foto en kaart, routelink | **Fictieve woningen**; ontwerpnotitie noemt een koppeling met Pararius Office |
| Over ons | Tekst, specialisaties, werkgebied, quote | OK |
| Contact | Bel/mail-tegels, kaart, contactformulier | **Verstuurt niets** |
| Footer | Menu, contact, partners, links naar privacy, cookies en voorwaarden | **Juridische links zijn `href="#"`** |

## 4. Gevonden problemen en risico's

**SEO (kritiek)**
- Client-side rendering zonder URL's: niets is afzonderlijk indexeerbaar. Er zijn geen titels, meta descriptions, canonicals, hreflang, sitemap of structured data.
- Engelse en Nederlandse inhoud staan op dezelfde URL.

**Functioneel**
- Geen enkel formulier verstuurt gegevens. Er is geen validatie, op `required` na.
- Keuzechips en keuzelijsten zijn `<button>`-elementen zonder formulierwaarde, dus de keuzes zouden nooit worden meegestuurd.
- Velden zonder `name`-attribuut.

**Toegankelijkheid**
- Het logo is een `<img onClick>` en geen link. Navigatie gebeurt via `<button>` in plaats van `<a href>`.
- De keuzelijsten (eigen listbox) zijn niet met het toetsenbord te bedienen.

**Privacy / AVG**
- Google Fonts en flagcdn.com worden van externe servers geladen, waardoor het IP-adres van de bezoeker naar derden gaat zonder noodzaak.
- Privacyverklaring en cookiebeleid ontbreken.

**Inhoud en betrouwbaarheid**
- **Ervaringen**: de 5 reviews ("Sanne & Joris", "Michael R." …) zijn niet herleidbaar en gelden daarom als voorbeeldtekst. Gepubliceerde, verzonnen reviews zijn misleidend (oneerlijke handelspraktijk) en in strijd met de Google-richtlijnen.
- **Woningaanbod**: 6 fictieve adressen met prijzen. Publiceren is misleidend.
- Het ontwerp zegt "Ook: aan- en verkoop" en het logo zegt "Koop ◆ Huur ◆ Beheer", maar er is geen pagina voor beheer. De briefing noemt beheer expliciet.

**Performance**
- React plus een runtime van 69 KB en rendering in de browser maken LCP afhankelijk van JavaScript. Het gordijn vertraagt elke navigatie met ±1,4 s.

**Beveiliging**
- Op dit moment geen aanvalsoppervlak, omdat er geen backend is. Er zijn geen bestandsuploads in het ontwerp, en ik voeg die ook niet toe.

## 5. Vergelijking van de ontwerpversies

| Onderdeel | v1 | v2 | Keuze |
|---|---|---|---|
| Typografie | Hanken Grotesk + Newsreader | Schibsted Grotesk + Newsreader | **v2** (nieuwste) |
| Talen | NL | NL + EN | **v2** |
| Aanhuurformulier | Chips | Chips + keuzelijsten + meerkeuze voor extra wensen | **v2**, opgebouwd uit native radio's en checkboxes |
| Toon | Persoonlijk vanuit "Diana" | Kantoorstem ("wij") | **v2 met de persoonlijke laag van v1** op de pagina *Over ons* (Diana Karens als eigenaar en vast aanspreekpunt). Dat bouwt vertrouwen op en levert E-E-A-T op. |
| Ervaringen | – | Carrousel | Component uit v2, **alleen zichtbaar met echte reviews** |

Kleuren, spacing, componentvormen en animaties zijn in beide versies gelijk. Die neem ik 1-op-1 over.

## 6. Behouden vs. opnieuw bouwen

- **Behouden:** huisstijl (kleuren `#043a63` / `#021f36` / `#3d6d96` / `#e6eef5` / `#f8f7f4`), typografie, layout per sectie, alle teksten, de interacties (keuzetegels, foto/kaart-toggle, wijkfilter, carrousel, de student/werkende-schakelaar met schuivende pil, keuzelijsten en chips) en de reveal-animaties.
- **Opnieuw bouwen:** alle techniek. De ontwerptool-runtime gaat eruit, net als de inline styles en de client-side routing.

## 7. Gekozen architectuur

**Astro 7 (statische generatie) met een kleine Node-server voor de formulier-API.**

Waarom:
- Elke pagina wordt bij de build vooraf gerenderd naar HTML. Dat geeft de beste SEO en LCP, en er wordt standaard geen JavaScript meegestuurd.
- De componentstructuur zorgt voor hergebruik en geen dubbele code. Ingebouwde i18n-routing regelt `/` en `/en/`.
- Formulier-endpoints draaien op dezelfde Node-server (`@astrojs/node`), dus er is één deploybare eenheid (Docker of een gewone Node-host) die niet aan één hostingpartij vastzit.
- Weinig afhankelijkheden: `astro`, `@astrojs/node`, `nodemailer` (SMTP) en lokaal gehoste fonts (`@fontsource-variable/*`). Validatie en sitemap schrijf ik zelf (klein en controleerbaar). Testen gebeurt met de ingebouwde `node:test` en de reeds aanwezige Playwright.

Alternatieven die ik heb overwogen:
- *Next.js*: te zwaar voor een brochure-site.
- *Een headless CMS*: nu niet nodig. Inhoud staat in getypeerde bestanden en kan later worden aangesloten.
- *Een externe form-SaaS*: zorgt voor dataverwerking bij derden en vendor lock-in.

### Mappenstructuur
```
src/
  components/      herbruikbare UI (Header, Footer, ListingCard, ChoiceChips, WishSelect, Stepper, …)
  layouts/         BaseLayout (meta, hreflang, JSON-LD, header/footer)
  i18n/            routes.ts (pagina ↔ slug per taal), nl.ts, en.ts (alle teksten)
  content/         site.ts (bedrijfsgegevens), listings.ts, reviews.ts
  lib/forms/       schema.ts (gedeeld client+server), validate.ts, deliver.ts (sinks), spam.ts, ratelimit.ts
  pages/           [NL-routes], en/[EN-routes], api/forms/[form].ts, sitemap.xml.ts, robots.txt.ts
  scripts/         kleine client-scripts (menu, reveal, formulieren, carrousel)
server.mjs         productieserver: security-headers, static caching, Astro-handler
```

## 8. URL-structuur

| Pagina | NL | EN |
|---|---|---|
| Home | `/` | `/en/` |
| Aanhuur | `/aanhuurmakelaar-den-haag/` | `/en/rental-agent-the-hague/` |
| Verhuren | `/verhuurmakelaar-den-haag/` | `/en/letting-agent-the-hague/` |
| Vastgoedbeheer (nieuw) | `/vastgoedbeheer-den-haag/` | `/en/property-management-the-hague/` |
| Expats (nieuw) | `/expats/` | `/en/expat-housing-the-hague/` |
| Woningaanbod | `/woningaanbod/` | `/en/rental-listings/` |
| Over ons | `/over-ons/` | `/en/about-us/` |
| Contact | `/contact/` | `/en/contact/` |
| Privacy | `/privacyverklaring/` | `/en/privacy-statement/` |
| Cookies | `/cookiebeleid/` | `/en/cookie-policy/` |

Nieuwe landingspagina's alleen waar er een duidelijk eigen zoekintentie is (beheer, expats). Geen tientallen plaatspagina's.

## 9. Formulieren en gegevensverwerking

1. **Eén schema per formulier** (`schema.ts`): velden, verplicht/optioneel, max. lengte, toegestane keuzes (taalonafhankelijke sleutels) en conditionele velden (student vs. werkende). Hetzelfde schema wordt gebruikt voor de clientvalidatie en de servervalidatie.
2. **Client:** native inputs. Validatie per veld (bij blur en bij "volgende"), foutmelding per veld met `aria-describedby`, focus naar het eerste foutieve veld. Een stappenformulier met terug/volgende-knoppen (aanhuur: 3 stappen, verhuur: 2 stappen). Tijdens het versturen is de knop geblokkeerd met een laadstatus. Het succesbericht is het ontwerp-blok "Bedankt".
3. **Server (`POST /api/forms/:form`):**
   - Origin-check (CSRF)
   - Content-Type en max. body (32 KB)
   - Rate limit per IP (gehasht, in geheugen)
   - Honeypot-veld
   - HMAC-ondertekend tijdstoken (minimale invultijd 3 s, max. 2 uur, bots die direct POSTen falen)
   - Validatie volgens het schema en normalisatie (telefoon → E.164, trim, lengte)
   - Bezorging
4. **Bezorging via "sinks":** standaard een **e-mail via SMTP** (Nodemailer) naar `MAIL_TO`, met `Reply-To` = de inzender, een overzichtelijke HTML-tabel en een tekstversie (alles ge-escaped). Een optionele **webhook-sink** (`FORMS_WEBHOOK_URL`, HMAC-ondertekend) maakt een latere CRM-koppeling mogelijk zonder codewijziging.
5. **Betrouwbaarheid:** lukt het verzenden niet, dan gaat de inzending naar een lokale outbox (`data/outbox`, bestandsrechten 0600). Een retry draait elke 5 minuten. Na succes wordt het bestand verwijderd en na 14 dagen wordt het sowieso opgeruimd. Er wordt **geen database** gebruikt, omdat die functioneel niet nodig is: de mailbox en later het CRM zijn de bron.
6. **Logging zonder persoonsgegevens:** alleen formuliertype, uitkomst en een request-id.

## 10. Beveiliging

- CSP zonder `unsafe-inline` voor scripts. Geen inline scripts en styles, alleen eigen origin plus `frame-src` voor OpenStreetMap.
- Overige headers: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'` en COOP.
- Geen geheimen in de frontend. Alles staat in omgevingsvariabelen en de server start niet in productie zonder verplichte configuratie.
- Geen SQL en geen database, dus geen SQL-injectie. Output-escaping in e-mails, header-injectie onmogelijk (CR/LF gestript) en geen bestandsuploads.
- Fonts en vlaggen worden lokaal gehost. Er zijn geen trackers en **geen cookies**, dus een cookiebanner is niet nodig. Dat staat ook in het cookiebeleid.

## 11. Wat de klant nog moet aanleveren (wordt niet verzonnen)

Foto's (hero, portret/kantoor, verhuurfoto), echte reviews, actueel aanbod of toegang tot de Pararius Office-feed, KvK-nummer, het definitieve domein, SMTP-gegevens, eventuele algemene voorwaarden en het Google Business Profile.
Zolang deze ontbreken, toont de site **nette, ontworpen alternatieven** in plaats van placeholders. De sectie ervaringen en het uitgelichte aanbod worden pas getoond als er data is. Het script `npm run launch-check` meldt wat nog ontbreekt.
