# Karens Real Estate — website

Tweetalige (NL/EN) website voor Karens Real Estate, huur-, aanhuur- en verhuurmakelaar in Den Haag.

- **Techniek:** [Astro 7](https://astro.build) (statisch vooraf gerenderd) met een kleine Node-server voor de formulieren (`@astrojs/node`) en Nodemailer (SMTP).
- **Eisen:** Node.js ≥ 22.12, een SMTP-mailbox en HTTPS via een reverse proxy (bijvoorbeeld Caddy) of een hostingplatform.
- **Documentatie:** [`docs/01-analyse-en-technisch-plan.md`](docs/01-analyse-en-technisch-plan.md) bevat de analyse en de architectuur. [`docs/02-oplevering-en-testrapport.md`](docs/02-oplevering-en-testrapport.md) bevat de testresultaten en de openstaande punten.

## Previews

| Homepage | Aanhuur met stappenformulier | Mobiel |
|---|---|---|
| ![Homepage](docs/preview-home.png) | ![Aanhuur](docs/preview-aanhuur.png) | ![Mobiel](docs/preview-mobiel.png) |

Demoversie met voorbeeldwoningen en -ervaringen:

| Homepage (demo) | Woningaanbod (demo) |
|---|---|
| ![Homepage demo](docs/preview-demo-home.png) | ![Woningaanbod demo](docs/preview-demo-aanbod.png) |

Zelf bekijken: `npm install` en dan `npm run demo` → http://localhost:4321. Een conceptpresentatie maken (gelabeld als concept, formulieren versturen niets): `npm run concept` → map `concept-dist/`.

---

## 1. Snel starten (ontwikkeling)

```bash
npm install
npm run dev            # http://localhost:4321 (formulieren werken niet in dev zonder .env, zie hieronder)
```

Formulieren lokaal testen, zonder echte e-mail. De mails komen dan als bestand in `data/dev-mail/`:

```bash
npm run build
MAIL_TRANSPORT=file MAIL_TO=test@example.nl SITE_URL=http://localhost:4321 node server.mjs
```

## 2. Scripts

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Ontwikkelserver met hot reload |
| `npm run build` | Productiebuild naar `dist/`. **Zet eerst `SITE_URL`.** |
| `npm start` | Productieserver (`server.mjs`) |
| `npm run check` | TypeScript- en Astro-typecheck |
| `npm test` | Unit-tests: validatie, tokens, rate limiting, e-mail en outbox |
| `npm run test:e2e` | End-to-end-tests met Playwright tegen de build: alle pagina's, links, SEO, formulieren, beveiliging en mobiel |
| `npm run demo` | Lokale demo met voorbeeldwoningen en -ervaringen; formulieren schrijven naar `data/dev-mail/` |
| `npm run concept` | Conceptpresentatie als statisch pakket in `concept-dist/` |
| `npm run launch-check` | Checklist voor de livegang: wat ontbreekt nog? (exitcode 1 = blokkerend) |
| `node scripts/generate-brand-assets.mjs` | Maakt favicons en de OG-afbeelding opnieuw vanuit het logo |

## 3. Configuratie

Alle instellingen staan in omgevingsvariabelen. Zie **[`.env.example`](.env.example)** voor de volledige lijst met uitleg. In productie start de server **niet** als een verplichte waarde ontbreekt. Zo gaan er geen aanvragen ongemerkt verloren.

| Variabele | Verplicht | Toelichting |
|---|---|---|
| `SITE_URL` | ja (build én runtime) | bijv. `https://www.karensrealestate.nl` |
| `FORM_SECRET` | ja | ≥ 32 tekens, `openssl rand -hex 32` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | ja | SMTP-gegevens van de mailprovider |
| `MAIL_FROM` | ja | Afzender. Het domein moet SPF/DKIM hebben voor deze server of dienst. |
| `MAIL_TO` | ja | Ontvanger(s) van de aanvragen |
| `CANONICAL_HOST` | aanbevolen | 301 van andere hostnamen naar de hoofddomeinnaam |
| `TRUST_PROXY_HOPS` | aanbevolen | `1` achter Caddy of nginx, nodig voor correcte rate limiting |
| `FORMS_WEBHOOK_URL`, `FORMS_WEBHOOK_SECRET` | nee | Koppeling met een CRM of Zapier/Make (zie §6) |
| `DATA_DIR` | nee | Map voor de outbox, moet blijvend en schrijfbaar zijn |

Geheimen staan **nooit** in de code of in de frontend.

## 4. Deployment

### Optie A — Docker (aanbevolen)
```bash
cp .env.example .env      # en vul in
docker compose up -d --build
```
De container draait als niet-root-gebruiker, met een healthcheck op `/api/health/` en een volume voor `data/`. Zet er een reverse proxy met HTTPS voor. In [`Caddyfile`](Caddyfile) staat een voorbeeld met automatische certificaten, compressie en een redirect van apex naar www.

### Optie B — Node-host / VPS
```bash
npm ci
SITE_URL=https://www.karensrealestate.nl npm run build
npm ci --omit=dev
NODE_ENV=production node server.mjs     # via systemd/pm2, achter Caddy/nginx
```

### Optie C — Cloudflare Worker
Eén Worker serveert de statische site (`dist/`) en de formulier-API. De code staat in [`worker/`](worker/), de instellingen in [`wrangler.jsonc`](wrangler.jsonc). Er is geen server of Docker nodig, en Cloudflare regelt HTTPS.

Verschillen met de Node-versie:
- **E-mail** gaat via de HTTP-API van [Resend](https://resend.com), omdat Workers geen SMTP kunnen gebruiken. Verifieer het afzenderdomein van `MAIL_FROM` in Resend (SPF/DKIM).
- **Outbox en eenmalige tokens** staan in Workers KV (`KRE_KV`). Een cron-trigger probeert mislukte aanvragen elke 5 minuten opnieuw.
- **Rate limiting** gebeurt per Worker-instantie in het geheugen. Zet voor extra bescherming een WAF-rate-limitregel op `/api/forms/*` in het Cloudflare-dashboard.

```bash
wrangler login
wrangler secret put FORM_SECRET        # openssl rand -hex 32
wrangler secret put RESEND_API_KEY
npm run cf:deploy                      # bouwt met DEPLOY_TARGET=cloudflare en deployt
```
Pas eerst `MAIL_TO`, `MAIL_FROM` en het domein aan in `vars` in `wrangler.jsonc`. Zet het eigen domein aan via `routes`; dat staat als voorbeeld in hetzelfde bestand. Tot dan draait de site op `karensrealestate.<account>.workers.dev`.

Lokaal testen: kopieer `.dev.vars.example` naar `.dev.vars` en voer `npm run cf:dev` uit → http://localhost:8787. De e-mails komen dan in lokale KV (`devmail:…`) in plaats van verstuurd te worden.

### DNS en e-mail
- `A`/`AAAA`-records voor `karensrealestate.nl` en `www` wijzen naar de server.
- Voeg voor de afzender van `MAIL_FROM` een **SPF**- en **DKIM**-record toe. Zonder deze records komen de notificaties mogelijk in de spam.
- HTTPS en HSTS zijn verplicht. HSTS wordt door `server.mjs` gezet zodra `NODE_ENV=production`.

### Na livegang
1. Voeg het domein toe aan **Google Search Console** en dien `https://www.karensrealestate.nl/sitemap.xml` in.
2. Koppel het **Google Business Profile** (zelfde naam, adres en telefoon als op de site) en zet de profiel-URL in `site.sameAs`.
3. Stuur via elk formulier één testaanvraag en controleer of de mail binnenkomt.
4. Monitoring: `GET /api/health/` geeft `{"ok":true,"outbox":0}` terug. Een `outbox` groter dan 0 betekent dat e-mail tijdelijk niet werkt. De server probeert het elke 5 minuten opnieuw.

### Back-ups
De website zelf bevat geen database. De bron is deze Git-repository. Alleen `DATA_DIR/outbox` bevat tijdelijk aanvragen die nog niet verzonden zijn. Die worden automatisch verwijderd na verzending of na 14 dagen, en hoeven niet in een back-up.

## 5. Inhoud beheren

| Wat | Waar |
|---|---|
| Bedrijfsgegevens (telefoon, adres, KvK, profielen) | `src/content/site.ts`. Wordt overal gebruikt: footer, contact, structured data en e-mail. |
| Alle teksten NL / EN | `src/i18n/nl.ts` en `src/i18n/en.ts`. Dezelfde sleutels; de typecheck bewaakt dat. |
| URL's per taal | `src/i18n/routes.ts` |
| Foto's | Zet `hero.jpg`, `over-ons.jpg` en `verhuren.jpg` in `src/assets/photos/`. Ze worden automatisch omgezet naar AVIF/WebP in meerdere formaten. Zonder foto toont de site een illustratie in huisstijl. |
| Woningaanbod | Automatisch uit Pararius Office via de listings-API (zie §6). Zonder API: handmatig in `src/content/listings.ts`; postcode en kaartpin worden dan opgezocht via PDOK. |
| Klantervaringen | `src/content/reviews.ts`. De sectie verschijnt automatisch zodra er echte reviews in staan. |
| Juridische teksten | `src/views/Privacy.astro` en `src/views/Cookies.astro` |

Na elke wijziging opnieuw bouwen en deployen.

**Demo-modus:** `KRE_DEMO_CONTENT=1 npm run build` toont de voorbeeldreviews uit het ontwerp (en voorbeeldwoningen als er geen listings-API is ingesteld). Zo'n build is gemarkeerd als demo en staat op `noindex`, en `launch-check` blokkeert hem.

## 6. Koppelingen

**Woningaanbod / Pararius Office (live).** Een aparte Cloudflare Worker, [`api-worker/`](api-worker/), is de enige plek die de Pararius Office-API-key kent en ooit met Pararius praat.

```
Pararius Office ──(key, max 1×/min)──► api-worker (cron elke 5 min → KV)
                                          │  GET /v1/listings  (publiek, gecachet, alleen veilige velden)
                       ┌──────────────────┴──────────────────┐
                 build van de site                 browser van de bezoeker
            (statische HTML voor Google)        (actueel aanbod bij elk bezoek)
```

- **Endpoints:** `GET /v1/listings` (aanbod) en `GET /v1/health` (aantal, versie, leeftijd van de data). Alle andere paden geven 404, alle andere methodes 405.
- **Pararius wordt nooit door bezoekers aangeroepen.** Pararius staat 1 verzoek per minuut toe. De cron ververst elke 5 minuten; bezoekers krijgen de edge-cache of KV. Alleen bij een lege KV (eerste start) haalt hij één keer direct op, achter een slot van 60 s. Geeft Pararius een fout of 429, dan blijft het laatste goede aanbod staan.
- **Alleen veilige velden** ([`api-worker/src/pararius.ts`](api-worker/src/pararius.ts)): straat, postcode (4 cijfers), wijk, plaats, kaartpositie (~100 m), huur, m², slaapkamers, status, beschikbaarheid en de hoofdfoto. Geen huisnummer, kadaster, WOZ, eisen aan huurders of optieprijzen. Huisnummer en exacte pin aan: `EXACT_ADDRESS=1` in `api-worker/wrangler.jsonc`. Welke objecttypes: `INCLUDE_TYPES` (standaard geen parkeerplaatsen en bergingen).
- **Afscherming:** CORS alleen voor de eigen domeinen (`ALLOWED_ORIGINS`, andere sites krijgen 403), geen invoer wordt gebruikt of teruggegeven, foto-URL's alleen van de Pararius-CDN, strikte headers (`nosniff`, CSP `default-src 'none'`), plus een rate limit per IP (best effort; Cloudflare telt per locatie). De site laat in zijn CSP alleen deze API (`connect-src`) en de Pararius-CDN (`img-src`) toe. De browser zet data uitsluitend via `textContent`/attributen in de pagina, nooit als HTML.
- **Status:** verhuurde woningen blijven zichtbaar met het label *Verhuurd* (onderaan; niet op de homepage en niet in de structured data). *Nieuw* en *Onder optie* worden automatisch gezet.
- **Site:** de build leest de API (`LISTINGS_API_URL`, standaard de productie-API) voor de statische HTML; [`src/scripts/listings-live.ts`](src/scripts/listings-live.ts) haalt in de browser het actuele aanbod op en tekent de kaarten opnieuw als het aanbod sindsdien veranderd is. De GitHub Action [`woningaanbod.yml`](.github/workflows/woningaanbod.yml) bouwt de statische pagina's opnieuw zodra de API-versie afwijkt van `/aanbod-versie.txt` (alleen nodig voor Google; heeft alleen de Cloudflare-secrets nodig).

**Beheer:**
```bash
npm run api:deploy                                    # API-worker deployen
cd api-worker && npx wrangler secret put PARARIUS_OFFICE_TOKEN   # key instellen of vervangen
npm run e2e:local                                     # alles lokaal: API op :8788, site op :8787
```
Voor lokaal werken staat de key in `api-worker/.dev.vars` (niet in git) samen met `ALLOWED_ORIGINS=http://localhost:8787`. Een nieuwe key maak je in Pararius Office onder *Tools → API keys*; daarna `wrangler secret put` en de oude key verwijderen.

**CRM.** Elke inzending kan naast de e-mail ook als ondertekende JSON naar `FORMS_WEBHOOK_URL` gestuurd worden. Controleer de handtekening (`X-KRE-Signature: sha256=<hmac>`) met `FORMS_WEBHOOK_SECRET`. Zo is een CRM, Zapier of Make te koppelen zonder codewijziging. Een extra kanaal toevoegen kan in `src/lib/server/deliver.ts` (`SINKS`).

## 7. Beveiliging (samenvatting)

- **CSP** zonder `unsafe-inline` (geen inline scripts of styles), plus HSTS, `nosniff`, `frame-ancestors 'none'`, Referrer- en Permissions-Policy (`server.mjs`).
- **Formulieren:**
  - Origin-check (CSRF) en alleen JSON
  - Maximaal 32 KB per verzoek
  - Rate limit per gehasht IP-adres
  - Honeypot
  - HMAC-ondertekend tijdstoken (minimaal 3 s oud, maximaal 2 uur, eenmalig te gebruiken)
  - Validatie op de server met hetzelfde schema als in de browser
  - HTML-escaping in e-mails
  - Geen header-injectie
- **Geen database**, geen bestandsuploads en geen cookies. Logs bevatten geen persoonsgegevens; de e2e-test controleert dat.
- De rate limiter werkt in het geheugen en per instantie. Draai je meerdere instanties, regel de rate limiting dan in de proxy.
- Afhankelijkheden: `npm audit` gaf bij de oplevering 0 kwetsbaarheden.

## 8. Wat de klant nog moet aanleveren

`npm run launch-check` geeft de actuele lijst.

1. **KvK-nummer** (blokkerend). Wettelijk verplicht op de website.
2. **SMTP-gegevens** en een afzenderadres met SPF/DKIM.
3. **Definitief domein** (nu aangenomen: `www.karensrealestate.nl`, op basis van het e-mailadres).
4. **Foto's**: hero, portret of kantoor, en een verhuurfoto.
5. **Woningaanbod** of toegang tot de Pararius Office-feed.
6. **Echte reviews**, bijvoorbeeld van Google of Pararius, met toestemming.
7. **Google Business Profile**-URL en eventuele socials.
8. Akkoord van de klant op de nieuwe teksten (FAQ's, de pagina's *Vastgoedbeheer* en *Expats*) en op de **bewaartermijn** van aanvragen in de privacyverklaring (voorstel: 12 maanden).
9. Eventuele **algemene voorwaarden**. De link is weggelaten tot er een tekst is.
10. Btw-nummer (optioneel).

## 9. Licenties

De fonts *Schibsted Grotesk* en *Newsreader* vallen onder de SIL Open Font License en worden lokaal gehost (`src/assets/fonts/`). Het logo is eigendom van Karens Real Estate.
