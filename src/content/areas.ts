/**
 * Werkgebied: one page per neighbourhood or town (/werkgebied/<slug>/ and /en/areas/<slug>/).
 *
 * Texts are a general, factual impression of each area. Street names were checked
 * against the CBS wijk/buurt boundaries (PDOK) and the map centres come from PDOK.
 * Deliberately no rent figures or school lists: those change and must come from the client.
 *
 * `match` decides which listings appear on the page: a listing matches when its wijk
 * (from the feed or PDOK) contains one of `wijken`, or its city is one of `cities`.
 */
import type { Lang } from '../i18n/index.ts';
import type { Listing } from './listings.ts';

type T = { nl: string; en: string };
type TL = { nl: readonly string[]; en: readonly string[] };
type Faq = { nl: readonly (readonly [string, string])[]; en: readonly (readonly [string, string])[] };

export interface Area {
  slug: string;
  name: T;
  /** Neighbourhood of The Hague, or a separate town in the region. */
  kind: 'wijk' | 'plaats';
  /** Municipality, for structured data. */
  municipality: string;
  center: { lat: number; lon: number };
  /** Half-width of the map in degrees (longitude); height is derived. */
  zoom: number;
  match: { wijken: readonly string[]; cities: readonly string[] };
  seo: { title: T; description: T };
  tagline: T;
  intro: T;
  character: T;
  housing: T;
  living: T;
  access: T;
  goodFor: TL;
  faq: Faq;
  near: readonly string[];
}

export const AREAS: readonly Area[] = [
  {
    slug: 'statenkwartier',
    name: { nl: 'Statenkwartier', en: 'Statenkwartier' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.094213, lon: 4.276709 }, zoom: 0.008,
    match: { wijken: ['statenkwartier'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Statenkwartier Den Haag | Karens Real Estate', en: 'Renting in Statenkwartier, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in het Statenkwartier? Monumentale herenhuizen rond de Frederik Hendriklaan, dicht bij zee en musea. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Statenkwartier, The Hague? Characterful townhouses around the Frederik Hendriklaan, close to the sea and museums. Personal advice.',
      },
    },
    tagline: { nl: 'Statige herenhuizen rond de Frederik Hendriklaan, dicht bij zee en musea.', en: 'Stately townhouses around the Frederik Hendriklaan, close to the sea and museums.' },
    intro: {
      nl: 'Het Statenkwartier is een van de meest gewilde woonwijken van Den Haag. De wijk combineert statige architectuur van rond 1900 met een levendige winkelstraat, en ligt tussen het centrum en de kust in.',
      en: 'Statenkwartier is one of the most sought-after residential areas of The Hague. It combines stately architecture from around 1900 with a lively shopping street, and lies between the city centre and the coast.',
    },
    character: {
      nl: 'Brede lanen, veel groen en gevels met jugendstil-details bepalen het straatbeeld. Het hart van de wijk is de Frederik Hendriklaan, door bewoners ‘de Fred’ genoemd, met speciaalzaken, bakkers en terrassen. Aan de rand van de wijk liggen het Kunstmuseum Den Haag en het Museon-Omniversum, en ook het World Forum en verschillende internationale organisaties zijn dichtbij.',
      en: 'Wide avenues, plenty of greenery and façades with Art Nouveau details shape the streets. The heart of the area is the Frederik Hendriklaan, known locally as ‘the Fred’, with specialist shops, bakeries and terraces. On the edge of the neighbourhood are the Kunstmuseum Den Haag and Museon-Omniversum, and the World Forum and several international organisations are close by.',
    },
    housing: {
      nl: 'Je vindt hier vooral herenhuizen, boven- en benedenwoningen en appartementen in karakteristieke panden, vaak met hoge plafonds en en-suitekamers. Er zijn zowel gemeubileerde als kale woningen te huur. Door de grote vraag gaan goede woningen hier snel weg.',
      en: 'The area mainly offers townhouses, upper and lower apartments and flats in characterful buildings, often with high ceilings and connecting rooms. Both furnished and unfurnished homes are available to rent. Because demand is high, good homes are let quickly.',
    },
    living: {
      nl: 'Dagelijkse boodschappen doe je op de Frederik Hendriklaan. Het strand van Scheveningen, de duinen en parken zoals de Scheveningse Bosjes liggen op fietsafstand. De wijk is rustig en veilig, wat haar populair maakt bij gezinnen.',
      en: 'Daily shopping is done on the Frederik Hendriklaan. Scheveningen beach, the dunes and parks such as the Scheveningse Bosjes are within cycling distance. The area is quiet and safe, which makes it popular with families.',
    },
    access: {
      nl: 'Trams verbinden de wijk met het centrum en Scheveningen. Met de fiets ben je in een kwartier in het centrum. Parkeren is in grote delen van de wijk gereguleerd met een vergunning.',
      en: 'Trams connect the area with the city centre and Scheveningen, and the centre is about fifteen minutes away by bike. Parking is regulated by permit in large parts of the neighbourhood.',
    },
    goodFor: {
      nl: ['Gezinnen die rust en groen zoeken', 'Expats die werken bij internationale organisaties', 'Liefhebbers van karakteristieke panden'],
      en: ['Families looking for peace and greenery', 'Expats working at international organisations', 'Lovers of characterful buildings'],
    },
    faq: {
      nl: [
        ['Waarom is het Statenkwartier zo populair?', 'Door de combinatie van monumentale woningen, een gezellige winkelstraat, de nabijheid van zee en strand, en de korte afstand tot internationale organisaties en het centrum.'],
        ['Is het lastig om een huurwoning in het Statenkwartier te vinden?', 'Het aanbod is beperkt en de vraag groot. Met een zoekopdracht houden we het aanbod voor je in de gaten, ook woningen die nog niet online staan, zodat je snel kunt reageren.'],
      ],
      en: [
        ['Why is Statenkwartier so popular?', 'Because of its combination of monumental homes, a pleasant shopping street, the nearby sea and beach, and the short distance to international organisations and the city centre.'],
        ['Is it hard to find a rental home in Statenkwartier?', 'Supply is limited and demand is high. With a search request we monitor the market for you, including homes that are not yet advertised, so you can respond quickly.'],
      ],
    },
    near: ['archipelbuurt', 'scheveningen', 'duinoord'],
  },
  {
    slug: 'centrum',
    name: { nl: 'Centrum', en: 'City Centre' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.078148, lon: 4.309774 }, zoom: 0.01,
    match: { wijken: ['centrum'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Centrum Den Haag | Karens Real Estate', en: 'Renting in The Hague City Centre | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in het centrum van Den Haag? Wonen tussen grachten, winkels en het Binnenhof, met alles op loopafstand. Persoonlijke begeleiding.',
        en: 'Looking to rent or let a home in the centre of The Hague? Live among canals, shops and the Binnenhof, with everything within walking distance. Personal guidance.',
      },
    },
    tagline: { nl: 'Wonen tussen de grachten, winkels en het Binnenhof, met alles op loopafstand.', en: 'Living among canals, shops and the Binnenhof, with everything within walking distance.' },
    intro: {
      nl: 'In het centrum van Den Haag woon je midden in de stad: tussen historische grachten, pleinen, winkels en restaurants, en op loopafstand van de twee grote treinstations.',
      en: 'In the centre of The Hague you live in the heart of the city: among historic canals, squares, shops and restaurants, and within walking distance of the two main railway stations.',
    },
    character: {
      nl: 'Het centrum is het bestuurlijke en culturele hart van Den Haag, met het Binnenhof en de Hofvijver, het Mauritshuis, het Lange Voorhout en het Plein. Daarnaast heeft het centrum een eigen dorpse kant: rond de Grote Markt, in Chinatown en langs de grachten wonen veel mensen in kleinschalige straten.',
      en: 'The centre is the political and cultural heart of The Hague, with the Binnenhof and Hofvijver, the Mauritshuis, the Lange Voorhout and the Plein. It also has a village-like side: around the Grote Markt, in Chinatown and along the canals many people live in small-scale streets.',
    },
    housing: {
      nl: 'Het aanbod is gevarieerd: appartementen in monumentale grachtenpanden, woningen boven winkels en moderne appartementen in nieuwbouw rond Den Haag Centraal. Studio’s en appartementen met één of twee slaapkamers komen het meest voor.',
      en: 'The supply is varied: apartments in monumental canal houses, homes above shops and modern apartments in new-build towers around Den Haag Centraal. Studios and one- or two-bedroom apartments are the most common.',
    },
    living: {
      nl: 'Winkels, markten, theaters, musea en horeca liggen om de hoek. Het Haagse Bos en het Malieveld zijn vlakbij. Houd er rekening mee dat het in het centrum ’s avonds en in het weekend levendig kan zijn.',
      en: 'Shops, markets, theatres, museums, restaurants and bars are around the corner, and the Haagse Bos woods and the Malieveld are close by. Keep in mind that the centre can be lively in the evenings and at weekends.',
    },
    access: {
      nl: 'Den Haag Centraal en station Hollands Spoor liggen op loopafstand, met snelle verbindingen naar onder meer Rotterdam, Leiden, Amsterdam en Schiphol. Tram en bus rijden in alle richtingen. Een auto is hier zelden nodig; parkeren is beperkt en duur.',
      en: 'Den Haag Centraal and Hollands Spoor stations are within walking distance, with fast connections to Rotterdam, Leiden, Amsterdam and Schiphol among others. Trams and buses run in every direction. A car is rarely needed here; parking is limited and expensive.',
    },
    goodFor: {
      nl: ['Starters en young professionals', 'Forenzen die vaak met de trein reizen', 'Wie houdt van cultuur en uitgaan'],
      en: ['Starters and young professionals', 'Commuters who travel by train', 'Those who love culture and going out'],
    },
    faq: {
      nl: [
        ['Is wonen in het centrum van Den Haag druk?', 'Dat hangt sterk af van de straat. Rond de winkelstraten en pleinen is het levendig, maar langs de grachten en in de zijstraten woon je vaak verrassend rustig. We kijken graag met je mee.'],
        ['Heb ik een auto nodig in het centrum?', 'Meestal niet. Alles is te voet of met de fiets bereikbaar en beide stations liggen dichtbij. Parkeren is beperkt; vraag bij een woning altijd naar de mogelijkheden.'],
      ],
      en: [
        ['Is living in the centre of The Hague busy?', 'That depends a lot on the street. Around the shopping streets and squares it is lively, but along the canals and in side streets it is often surprisingly quiet. We are happy to advise you.'],
        ['Do I need a car in the city centre?', 'Usually not. Everything is reachable on foot or by bike and both stations are close. Parking is limited; always ask about the options for a specific home.'],
      ],
    },
    near: ['zeeheldenkwartier', 'archipelbuurt', 'bezuidenhout'],
  },
  {
    slug: 'scheveningen',
    name: { nl: 'Scheveningen', en: 'Scheveningen' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.104204, lon: 4.273405 }, zoom: 0.014,
    match: { wijken: ['scheveningen'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Scheveningen | Karens Real Estate', en: 'Renting in Scheveningen, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in Scheveningen? Strand, haven en boulevard: wonen met de zee om de hoek. Karens Real Estate kent de wijk en begeleidt je persoonlijk.',
        en: 'Looking to rent or let a home in Scheveningen? Beach, harbour and boulevard: living with the sea around the corner. Karens Real Estate knows the area and guides you.',
      },
    },
    tagline: { nl: 'Strand, haven en boulevard: wonen met de zee om de hoek.', en: 'Beach, harbour and boulevard: living with the sea around the corner.' },
    intro: {
      nl: 'Scheveningen is de badplaats van Den Haag. Je woont hier met het strand en de zee op loopafstand, en toch ben je met de tram snel in het centrum.',
      en: 'Scheveningen is The Hague’s seaside resort. You live within walking distance of the beach and the sea, yet the city centre is only a short tram ride away.',
    },
    character: {
      nl: 'Scheveningen heeft twee gezichten. Rond het Kurhaus, de Pier en de boulevard is het in de zomer druk en levendig. Scheveningen-Dorp en het gebied rond de haven hebben een eigen, oorspronkelijk karakter, met vissershuisjes en de havens met vis- en jachtschepen. Buiten het hoogseizoen is het opvallend rustig.',
      en: 'Scheveningen has two faces. Around the Kurhaus, the Pier and the boulevard it is busy and lively in summer. Scheveningen-Dorp and the harbour area have their own authentic character, with fishermen’s cottages and harbours full of fishing and sailing boats. Outside the high season it is remarkably quiet.',
    },
    housing: {
      nl: 'Er zijn appartementen met uitzicht op zee, nieuwbouw rond de haven, karakteristieke vissershuisjes in het Dorp en ruime woningen in de lanen richting de duinen. Woningen met zeezicht zijn schaars en gewild.',
      en: 'There are apartments with sea views, new builds around the harbour, characterful fishermen’s cottages in the old village and spacious homes on the avenues towards the dunes. Homes with a sea view are scarce and in high demand.',
    },
    living: {
      nl: 'Strand, duinen, de haven en de Scheveningse Bosjes maken Scheveningen ideaal voor wie graag buiten is: wandelen, hardlopen, surfen of zeilen. Er zijn winkels voor de dagelijkse boodschappen en veel restaurants, vooral rond de boulevard en de haven.',
      en: 'The beach, dunes, harbour and the Scheveningse Bosjes make Scheveningen ideal for anyone who loves the outdoors: walking, running, surfing or sailing. There are shops for daily needs and many restaurants, especially around the boulevard and the harbour.',
    },
    access: {
      nl: 'Meerdere tramlijnen verbinden Scheveningen met het centrum en Den Haag Centraal. Op zonnige zomerdagen kan het verkeer naar de kust druk zijn. Parkeren is in grote delen van Scheveningen gereguleerd.',
      en: 'Several tram lines connect Scheveningen with the city centre and Den Haag Centraal. On sunny summer days, traffic to the coast can be busy. Parking is regulated in large parts of Scheveningen.',
    },
    goodFor: {
      nl: ['Wie elke dag de zee wil zien', 'Sporters en buitenmensen', 'Expats die een woning met uitzicht zoeken'],
      en: ['Anyone who wants to see the sea every day', 'Sports and outdoor lovers', 'Expats looking for a home with a view'],
    },
    faq: {
      nl: [
        ['Is Scheveningen in de zomer niet te druk om te wonen?', 'Rond de boulevard en de Pier is het in de zomer druk, maar de woonstraten iets verder van het strand blijven rustig. Bij het zoeken letten we op de ligging die bij jou past.'],
        ['Zijn er woningen met zeezicht te huur?', 'Ja, maar ze zijn schaars en worden snel verhuurd. Met een zoekopdracht houden we ze voor je in de gaten.'],
      ],
      en: [
        ['Isn’t Scheveningen too busy to live in during summer?', 'The boulevard and the Pier are busy in summer, but the residential streets a little further from the beach stay quiet. When searching we look for the location that suits you.'],
        ['Are there homes with a sea view for rent?', 'Yes, but they are scarce and let quickly. With a search request we keep an eye out for you.'],
      ],
    },
    near: ['statenkwartier', 'archipelbuurt', 'benoordenhout'],
  },
  {
    slug: 'duinoord',
    name: { nl: 'Duinoord', en: 'Duinoord' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.083595, lon: 4.281376 }, zoom: 0.007,
    match: { wijken: ['duinoord'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Duinoord Den Haag | Karens Real Estate', en: 'Renting in Duinoord, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in Duinoord? Karakteristieke bebouwing rond het Sweelinckplein, dicht bij het centrum en de winkels. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Duinoord, The Hague? Characterful buildings around the Sweelinckplein, close to the centre and shops. Personal advice from Karens Real Estate.',
      },
    },
    tagline: { nl: 'Karakteristieke bebouwing rond het Sweelinckplein, dicht bij het centrum.', en: 'Characterful buildings around the Sweelinckplein, close to the city centre.' },
    intro: {
      nl: 'Duinoord is een compacte, karakteristieke wijk tussen het centrum en het Statenkwartier. Je woont hier rustig, maar wel dicht bij alles wat de stad te bieden heeft.',
      en: 'Duinoord is a compact, characterful neighbourhood between the city centre and Statenkwartier. You live in a quiet setting, yet close to everything the city has to offer.',
    },
    character: {
      nl: 'Het bekendste plekje van Duinoord is het Sweelinckplein, een statig plein met een park in het midden en monumentale herenhuizen eromheen. De rest van de wijk bestaat uit sfeervolle straten met boven- en benedenwoningen uit het begin van de twintigste eeuw. De Reinkenstraat is de winkelstraat van de wijk.',
      en: 'Duinoord’s best-known spot is the Sweelinckplein, a stately square with a park in the middle and monumental townhouses around it. The rest of the area consists of attractive streets with upper and lower apartments from the early twentieth century. The Reinkenstraat is the local shopping street.',
    },
    housing: {
      nl: 'Het aanbod bestaat vooral uit boven- en benedenwoningen en appartementen in karakteristieke panden, met hier en daar een ruim herenhuis. Veel woningen hebben originele details zoals hoge plafonds en ensuitedeuren.',
      en: 'The supply consists mainly of upper and lower apartments and flats in characterful buildings, with the occasional spacious townhouse. Many homes have original features such as high ceilings and connecting doors.',
    },
    living: {
      nl: 'Voor de dagelijkse boodschappen kun je terecht in de Reinkenstraat, en de winkelstraten van het Zeeheldenkwartier en het centrum zijn dichtbij. De Laan van Meerdervoort, een van de langste lanen van Nederland, loopt langs de wijk.',
      en: 'Daily shopping can be done in the Reinkenstraat, and the shopping streets of Zeeheldenkwartier and the city centre are close by. The Laan van Meerdervoort, one of the longest avenues in the Netherlands, runs along the neighbourhood.',
    },
    access: {
      nl: 'Tram en bus verbinden Duinoord met het centrum, Scheveningen en de rest van de stad. Op de fiets ben je binnen enkele minuten in het centrum. Parkeren is gereguleerd.',
      en: 'Trams and buses connect Duinoord with the city centre, Scheveningen and the rest of the city. By bike the centre is only a few minutes away. Parking is regulated.',
    },
    goodFor: {
      nl: ['Stellen en starters', 'Wie rustig wil wonen dicht bij het centrum', 'Liefhebbers van jaren-1900-architectuur'],
      en: ['Couples and starters', 'Those who want a quiet home close to the centre', 'Lovers of early twentieth-century architecture'],
    },
    faq: {
      nl: [
        ['Waar ligt Duinoord precies?', 'Duinoord ligt tussen het centrum, het Zeeheldenkwartier en het Statenkwartier, langs de Laan van Meerdervoort.'],
        ['Wat voor woningen zijn er in Duinoord te huur?', 'Vooral appartementen en boven- en benedenwoningen in karakteristieke panden. Grote eengezinswoningen zijn hier schaarser.'],
      ],
      en: [
        ['Where exactly is Duinoord?', 'Duinoord lies between the city centre, Zeeheldenkwartier and Statenkwartier, along the Laan van Meerdervoort.'],
        ['What kind of homes are for rent in Duinoord?', 'Mainly apartments and upper and lower flats in characterful buildings. Large family houses are scarcer here.'],
      ],
    },
    near: ['zeeheldenkwartier', 'statenkwartier', 'regentessekwartier'],
  },
  {
    slug: 'regentessekwartier',
    name: { nl: 'Regentessekwartier', en: 'Regentessekwartier' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.076307, lon: 4.286624 }, zoom: 0.008,
    match: { wijken: ['regentesse', 'valkenbos'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Regentessekwartier Den Haag | Karens Real Estate', en: 'Renting in Regentessekwartier, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in het Regentessekwartier? Gezellige wijk met karakteristieke bebouwing en de Weimarstraat als winkelstraat. Persoonlijke begeleiding.',
        en: 'Looking to rent or let a home in Regentessekwartier, The Hague? A friendly area with characterful homes and the Weimarstraat as its shopping street. Personal guidance.',
      },
    },
    tagline: { nl: 'Gezellige wijk met karakteristieke bebouwing en de Weimarstraat om de hoek.', en: 'A friendly neighbourhood with characterful homes and the Weimarstraat around the corner.' },
    intro: {
      nl: 'Het Regentessekwartier is een gezellige, levendige wijk met een gemengde bevolking. Je woont er betaalbaarder dan in de wijken richting de kust, met winkels en voorzieningen dichtbij.',
      en: 'Regentessekwartier is a friendly, lively neighbourhood with a diverse population. Living here tends to be more affordable than in the areas towards the coast, with shops and amenities nearby.',
    },
    character: {
      nl: 'De wijk is gebouwd in het begin van de twintigste eeuw en heeft veel straten met mooie gevels en kleinschalige woningen. De Weimarstraat, op de grens met het Valkenboskwartier, is een lange winkelstraat met dagelijkse boodschappen, speciaalzaken en horeca.',
      en: 'The neighbourhood was built in the early twentieth century and has many streets with attractive façades and small-scale homes. The Weimarstraat, on the border with Valkenboskwartier, is a long shopping street with daily groceries, specialist shops and cafés.',
    },
    housing: {
      nl: 'Het aanbod bestaat vooral uit boven- en benedenwoningen en appartementen, vaak met één tot drie slaapkamers. Dat maakt de wijk interessant voor starters, stellen en kleine gezinnen.',
      en: 'The supply mainly consists of upper and lower apartments and flats, often with one to three bedrooms. That makes the area attractive to starters, couples and small families.',
    },
    living: {
      nl: 'Naast de Weimarstraat ligt ook de Fahrenheitstraat in het naburige Valkenboskwartier op korte afstand. Parken en het groen langs de Laan van Meerdervoort zijn dichtbij, en het strand van Kijkduin en Scheveningen is goed met de fiets bereikbaar.',
      en: 'Besides the Weimarstraat, the Fahrenheitstraat in neighbouring Valkenboskwartier is also close by. Parks and the green spaces along the Laan van Meerdervoort are near, and the beaches at Kijkduin and Scheveningen are easy to reach by bike.',
    },
    access: {
      nl: 'Trams en bussen bieden directe verbindingen met het centrum en Den Haag Centraal. Met de fiets ben je in ongeveer tien minuten in het centrum.',
      en: 'Trams and buses provide direct connections to the city centre and Den Haag Centraal. By bike the centre is about ten minutes away.',
    },
    goodFor: {
      nl: ['Starters en stellen', 'Wie een levendige, gemengde wijk zoekt', 'Wie wat meer woning voor zijn budget wil'],
      en: ['Starters and couples', 'Those looking for a lively, diverse neighbourhood', 'Those who want more home for their budget'],
    },
    faq: {
      nl: [
        ['Is het Regentessekwartier een goede wijk om te huren?', 'Ja, zeker voor wie een gezellige, levendige wijk zoekt dicht bij het centrum. De huurprijzen liggen gemiddeld lager dan in het Statenkwartier of Benoordenhout.'],
        ['Wat is het verschil met het Valkenboskwartier?', 'De wijken grenzen aan elkaar en lijken op elkaar. De Weimarstraat vormt de grens. We zoeken in beide wijken mee.'],
      ],
      en: [
        ['Is Regentessekwartier a good area to rent in?', 'Yes, especially if you want a friendly, lively neighbourhood close to the centre. Rents are on average lower than in Statenkwartier or Benoordenhout.'],
        ['What is the difference with Valkenboskwartier?', 'The two areas border each other and are quite similar; the Weimarstraat forms the boundary. We search in both.'],
      ],
    },
    near: ['duinoord', 'zeeheldenkwartier', 'centrum'],
  },
  {
    slug: 'archipelbuurt',
    name: { nl: 'Archipelbuurt', en: 'Archipelbuurt' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.091836, lon: 4.302707 }, zoom: 0.007,
    match: { wijken: ['archipel', 'willemspark'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Archipelbuurt Den Haag | Karens Real Estate', en: 'Renting in Archipelbuurt, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in de Archipelbuurt? Monumentale straten met ambassades, dicht bij het centrum en de Scheveningse Bosjes. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Archipelbuurt, The Hague? Monumental streets with embassies, close to the centre and the Scheveningse Bosjes. Personal advice.',
      },
    },
    tagline: { nl: 'Monumentale straten met ambassades, vlak bij het centrum en het groen.', en: 'Monumental streets with embassies, close to the centre and green spaces.' },
    intro: {
      nl: 'De Archipelbuurt is een rustige, monumentale wijk op loopafstand van het centrum. De straten zijn vernoemd naar Indonesische eilanden, zoals de Javastraat en de Bankastraat.',
      en: 'Archipelbuurt is a quiet, monumental neighbourhood within walking distance of the city centre. Its streets are named after Indonesian islands, such as the Javastraat and the Bankastraat.',
    },
    character: {
      nl: 'Statige herenhuizen, villa’s en lommerrijke straten geven de Archipelbuurt een deftige uitstraling. In de wijk en het naburige Willemspark zijn veel ambassades en internationale organisaties gevestigd. Toch voelt de buurt dankzij de Bankastraat, met winkels en een paar restaurants, als een echte woonwijk.',
      en: 'Stately townhouses, villas and leafy streets give Archipelbuurt an elegant feel. Many embassies and international organisations are based in the area and neighbouring Willemspark. Thanks to the Bankastraat, with its shops and a few restaurants, it still feels like a real residential neighbourhood.',
    },
    housing: {
      nl: 'Je vindt hier ruime appartementen in monumentale panden, herenhuizen en enkele villa’s. Veel woningen zijn geschikt voor expats en diplomaten, en worden ook gemeubileerd aangeboden.',
      en: 'You will find spacious apartments in monumental buildings, townhouses and a few villas. Many homes are suitable for expats and diplomats and are also offered furnished.',
    },
    living: {
      nl: 'De Scheveningse Bosjes en het Vredespaleis liggen om de hoek, en het centrum is te voet bereikbaar. Voor boodschappen en een kop koffie ga je naar de Bankastraat.',
      en: 'The Scheveningse Bosjes and the Peace Palace are around the corner, and the city centre can be reached on foot. For groceries and a coffee, head to the Bankastraat.',
    },
    access: {
      nl: 'Tram en bus rijden langs de wijk richting het centrum, Den Haag Centraal en Scheveningen. Met de fiets ben je overal snel. Parkeren is gereguleerd.',
      en: 'Trams and buses run along the area towards the city centre, Den Haag Centraal and Scheveningen, and everything is quickly reached by bike. Parking is regulated.',
    },
    goodFor: {
      nl: ['Expats en diplomaten', 'Wie monumentaal en rustig wil wonen', 'Wie dicht bij het centrum en het groen wil zitten'],
      en: ['Expats and diplomats', 'Those who want a quiet, monumental home', 'Those who want to be close to both the centre and green spaces'],
    },
    faq: {
      nl: [
        ['Waarom wonen veel expats in de Archipelbuurt?', 'Door de ligging dicht bij ambassades en internationale organisaties, het centrum en het groen, en door het aanbod aan ruime, vaak gemeubileerde woningen.'],
        ['Is de Archipelbuurt rustig?', 'Ja. Het is een van de rustigere wijken dicht bij het centrum, met brede, lommerrijke straten.'],
      ],
      en: [
        ['Why do many expats live in Archipelbuurt?', 'Because it is close to embassies and international organisations, the city centre and green spaces, and offers spacious, often furnished homes.'],
        ['Is Archipelbuurt quiet?', 'Yes. It is one of the quieter areas close to the city centre, with wide, leafy streets.'],
      ],
    },
    near: ['statenkwartier', 'centrum', 'zeeheldenkwartier'],
  },
  {
    slug: 'zeeheldenkwartier',
    name: { nl: 'Zeeheldenkwartier', en: 'Zeeheldenkwartier' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.082423, lon: 4.296273 }, zoom: 0.007,
    match: { wijken: ['zeehelden'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Zeeheldenkwartier Den Haag | Karens Real Estate', en: 'Renting in Zeeheldenkwartier, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in het Zeeheldenkwartier? Levendige wijk met de Piet Heinstraat en de Elandstraat, op fietsafstand van centrum en strand.',
        en: 'Looking to rent or let a home in Zeeheldenkwartier, The Hague? A lively area with the Piet Heinstraat and Elandstraat, cycling distance from the centre and beach.',
      },
    },
    tagline: { nl: 'Levendige wijk met de Piet Heinstraat, cafés en karakteristieke panden.', en: 'A lively neighbourhood with the Piet Heinstraat, cafés and characterful buildings.' },
    intro: {
      nl: 'Het Zeeheldenkwartier is een levendige, creatieve wijk direct naast het centrum. De straten zijn vernoemd naar Nederlandse zeehelden, zoals Piet Hein en Zoutman.',
      en: 'Zeeheldenkwartier is a lively, creative neighbourhood right next to the city centre. Its streets are named after Dutch naval heroes, such as Piet Hein and Zoutman.',
    },
    character: {
      nl: 'De Piet Heinstraat en de Elandstraat zijn de winkelstraten van de wijk, met boetiekjes, delicatessenwinkels, cafés en restaurants. Rond het Prins Hendrikplein en in de zijstraten is het rustiger. De wijk is populair bij jonge professionals en creatieve ondernemers.',
      en: 'The Piet Heinstraat and Elandstraat are the neighbourhood’s shopping streets, with boutiques, delicatessens, cafés and restaurants. Around the Prins Hendrikplein and in the side streets it is quieter. The area is popular with young professionals and creative entrepreneurs.',
    },
    housing: {
      nl: 'Het aanbod bestaat vooral uit appartementen en boven- en benedenwoningen in panden van rond 1900, vaak met mooie details. Er zijn ook moderne appartementen in gerenoveerde of nieuwe gebouwen.',
      en: 'The supply mainly consists of apartments and upper and lower flats in buildings from around 1900, often with beautiful details. There are also modern apartments in renovated or new buildings.',
    },
    living: {
      nl: 'Alles is dichtbij: winkels en horeca in de eigen wijk, het centrum op loopafstand en het strand van Scheveningen op fietsafstand. Het Vredespaleis ligt aan de rand van de wijk.',
      en: 'Everything is close by: shops and restaurants in the neighbourhood itself, the city centre within walking distance and Scheveningen beach within cycling distance. The Peace Palace lies on the edge of the area.',
    },
    access: {
      nl: 'Tram en bus verbinden de wijk met het centrum, Den Haag Centraal en Scheveningen. Op de fiets ben je in een paar minuten in het centrum. Parkeren is gereguleerd.',
      en: 'Trams and buses connect the area with the city centre, Den Haag Centraal and Scheveningen, and the centre is a few minutes away by bike. Parking is regulated.',
    },
    goodFor: {
      nl: ['Young professionals', 'Wie van cafés en restaurants om de hoek houdt', 'Wie dicht bij het centrum wil wonen'],
      en: ['Young professionals', 'Those who like cafés and restaurants around the corner', 'Those who want to live close to the centre'],
    },
    faq: {
      nl: [
        ['Is het Zeeheldenkwartier een levendige wijk?', 'Ja, vooral rond de Piet Heinstraat en de Elandstraat. In de woonstraten eromheen is het een stuk rustiger.'],
        ['Hoe ver is het Zeeheldenkwartier van het strand?', 'Met de fiets ben je in ongeveer een kwartier bij het strand van Scheveningen; met de tram gaat het ook snel.'],
      ],
      en: [
        ['Is Zeeheldenkwartier a lively area?', 'Yes, especially around the Piet Heinstraat and Elandstraat. The residential streets around them are much quieter.'],
        ['How far is Zeeheldenkwartier from the beach?', 'By bike Scheveningen beach is about fifteen minutes away, and the tram is quick too.'],
      ],
    },
    near: ['centrum', 'duinoord', 'archipelbuurt'],
  },
  {
    slug: 'benoordenhout',
    name: { nl: 'Benoordenhout', en: 'Benoordenhout' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.097412, lon: 4.321338 }, zoom: 0.012,
    match: { wijken: ['benoordenhout'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Benoordenhout Den Haag | Karens Real Estate', en: 'Renting in Benoordenhout, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in Benoordenhout? Groene, ruim opgezette wijk bij het Haagse Bos en Clingendael, dicht bij Den Haag Centraal. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Benoordenhout, The Hague? A green, spacious area next to the Haagse Bos and Clingendael, close to Den Haag Centraal. Personal advice.',
      },
    },
    tagline: { nl: 'Groen en ruim opgezet, bij het Haagse Bos en landgoed Clingendael.', en: 'Green and spacious, next to the Haagse Bos and the Clingendael estate.' },
    intro: {
      nl: 'Benoordenhout is een groene, ruim opgezette wijk aan de noordoostkant van Den Haag. Je woont hier rustig, met bos en parken om de hoek en het centrum en Den Haag Centraal dichtbij.',
      en: 'Benoordenhout is a green, spacious neighbourhood on the north-east side of The Hague. Life here is quiet, with woods and parks around the corner and the city centre and Den Haag Centraal close by.',
    },
    character: {
      nl: 'De wijk wordt omringd door groen: het Haagse Bos, landgoed Clingendael met de bekende Japanse tuin, en de parken langs de Wassenaarseweg. Het straatbeeld wordt bepaald door villa’s, jaren-dertigwoningen en ruime appartementen. De Van Hoytemastraat is de gezellige winkelstraat van de wijk.',
      en: 'The area is surrounded by greenery: the Haagse Bos woods, the Clingendael estate with its well-known Japanese garden, and the parks along the Wassenaarseweg. The streets are lined with villas, 1930s houses and spacious apartments. The Van Hoytemastraat is the area’s pleasant shopping street.',
    },
    housing: {
      nl: 'Benoordenhout biedt veel ruime woningen: eengezinswoningen met tuin, villa’s en grote appartementen. Daarmee is het een van de wijken waar gezinnen en expats met een ruimer budget vaak naar zoeken.',
      en: 'Benoordenhout offers many spacious homes: family houses with gardens, villas and large apartments. That makes it one of the areas where families and expats with a larger budget often look.',
    },
    living: {
      nl: 'Voor de dagelijkse boodschappen ga je naar de Van Hoytemastraat. Wandelen, hardlopen en fietsen doe je in het Haagse Bos of op Clingendael, en via de duinen ben je snel aan zee.',
      en: 'Daily shopping is done on the Van Hoytemastraat. For walking, running and cycling there are the Haagse Bos and Clingendael, and the dunes lead you quickly to the sea.',
    },
    access: {
      nl: 'Den Haag Centraal ligt op korte afstand, en via de N44 ben je snel op de snelweg richting Leiden en Amsterdam. Tram en bus verbinden de wijk met het centrum.',
      en: 'Den Haag Centraal is a short distance away, and the N44 takes you quickly to the motorway towards Leiden and Amsterdam. Trams and buses connect the area with the city centre.',
    },
    goodFor: {
      nl: ['Gezinnen met kinderen', 'Expats die ruimte en groen zoeken', 'Forenzen richting Leiden en Amsterdam'],
      en: ['Families with children', 'Expats looking for space and greenery', 'Commuters towards Leiden and Amsterdam'],
    },
    faq: {
      nl: [
        ['Is Benoordenhout geschikt voor gezinnen?', 'Ja. De wijk is rustig en groen, met ruime woningen, vaak met tuin, en veel ruimte om buiten te spelen in het Haagse Bos en op Clingendael.'],
        ['Hoe ver is Benoordenhout van Den Haag Centraal?', 'Dichtbij: afhankelijk van waar je woont ben je met de fiets of het openbaar vervoer binnen enkele minuten bij het station.'],
      ],
      en: [
        ['Is Benoordenhout suitable for families?', 'Yes. The area is quiet and green, with spacious homes, often with a garden, and plenty of space to play outdoors in the Haagse Bos and at Clingendael.'],
        ['How far is Benoordenhout from Den Haag Centraal?', 'Close: depending on where you live, the station is a few minutes away by bike or public transport.'],
      ],
    },
    near: ['bezuidenhout', 'archipelbuurt', 'scheveningen'],
  },
  {
    slug: 'bezuidenhout',
    name: { nl: 'Bezuidenhout', en: 'Bezuidenhout' },
    kind: 'wijk', municipality: 'Den Haag', center: { lat: 52.082686, lon: 4.337931 }, zoom: 0.01,
    match: { wijken: ['bezuidenhout'], cities: [] },
    seo: {
      title: { nl: 'Huurwoning Bezuidenhout Den Haag | Karens Real Estate', en: 'Renting in Bezuidenhout, The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in het Bezuidenhout? Rustige wijk tussen het Haagse Bos en Den Haag Centraal, met de Theresiastraat als winkelstraat. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Bezuidenhout, The Hague? A quiet area between the Haagse Bos and Den Haag Centraal, with the Theresiastraat for shopping. Personal advice.',
      },
    },
    tagline: { nl: 'Rustig wonen tussen het Haagse Bos en Den Haag Centraal.', en: 'Quiet living between the Haagse Bos and Den Haag Centraal.' },
    intro: {
      nl: 'Het Bezuidenhout ligt tussen het Haagse Bos en het centrum, met twee treinstations dichtbij. Het is een rustige, prettige woonwijk met een eigen winkelstraat.',
      en: 'Bezuidenhout lies between the Haagse Bos and the city centre, with two railway stations nearby. It is a quiet, pleasant residential area with its own shopping street.',
    },
    character: {
      nl: 'Een groot deel van het Bezuidenhout werd verwoest bij het bombardement van 3 maart 1945 en daarna opnieuw opgebouwd. Daardoor staan vooroorlogse panden en naoorlogse woningen er naast elkaar. Het Haagse Bos aan de noordkant geeft de wijk veel groen. De Theresiastraat is de gezellige winkelstraat.',
      en: 'A large part of Bezuidenhout was destroyed in the bombing of 3 March 1945 and was rebuilt afterwards, so pre-war buildings and post-war homes stand side by side. The Haagse Bos on the north side brings plenty of greenery. The Theresiastraat is the area’s pleasant shopping street.',
    },
    housing: {
      nl: 'Het aanbod is gevarieerd: appartementen in vooroorlogse en naoorlogse bouw, boven- en benedenwoningen en enkele eengezinswoningen. De wijk biedt relatief veel ruimte voor je geld, zo dicht bij het centrum.',
      en: 'The supply is varied: apartments in pre-war and post-war buildings, upper and lower flats and some family houses. The area offers relatively good value for money, this close to the centre.',
    },
    living: {
      nl: 'In de Theresiastraat vind je supermarkten, speciaalzaken en horeca. Het Haagse Bos is ideaal om te wandelen en hard te lopen. Het Beatrixkwartier, met veel kantoren, ligt aan de rand van de wijk.',
      en: 'The Theresiastraat has supermarkets, specialist shops, cafés and restaurants. The Haagse Bos is ideal for walking and running, and the Beatrixkwartier, with many offices, lies on the edge of the area.',
    },
    access: {
      nl: 'Met Den Haag Centraal en station Den Haag Laan van NOI dichtbij zit je goed voor de trein. Ook tram en bus verbinden de wijk met het centrum, en de snelwegen zijn snel bereikbaar.',
      en: 'With Den Haag Centraal and Den Haag Laan van NOI stations nearby, the area is well placed for train travel. Trams and buses also connect it with the centre, and the motorways are within easy reach.',
    },
    goodFor: {
      nl: ['Forenzen die met de trein reizen', 'Wie werkt in het Beatrixkwartier of het centrum', 'Wie rustig wil wonen met bos om de hoek'],
      en: ['Commuters who travel by train', 'Those working in the Beatrixkwartier or the centre', 'Those who want a quiet home with woods nearby'],
    },
    faq: {
      nl: [
        ['Is het Bezuidenhout een goede wijk voor forenzen?', 'Ja. Twee treinstations liggen dichtbij en de snelwegen zijn snel bereikbaar, waardoor je makkelijk naar onder meer Rotterdam, Leiden en Amsterdam reist.'],
        ['Hoe groen is het Bezuidenhout?', 'Het Haagse Bos grenst aan de wijk. Daarnaast zijn er pleintjes en plantsoenen in de woonstraten.'],
      ],
      en: [
        ['Is Bezuidenhout a good area for commuters?', 'Yes. Two railway stations are close by and the motorways are quickly reached, making it easy to travel to Rotterdam, Leiden and Amsterdam among others.'],
        ['How green is Bezuidenhout?', 'The Haagse Bos borders the neighbourhood, and there are squares and small parks in the residential streets as well.'],
      ],
    },
    near: ['benoordenhout', 'centrum', 'voorburg'],
  },
  {
    slug: 'voorburg',
    name: { nl: 'Voorburg', en: 'Voorburg' },
    kind: 'plaats', municipality: 'Leidschendam-Voorburg', center: { lat: 52.076219, lon: 4.363526 }, zoom: 0.022,
    match: { wijken: ['voorburg'], cities: ['voorburg', 'leidschendam-voorburg'] },
    seo: {
      title: { nl: 'Huurwoning Voorburg | Karens Real Estate', en: 'Renting in Voorburg near The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in Voorburg? Rustig en groen wonen direct naast Den Haag, met de Vliet en het historische centrum. Persoonlijke begeleiding.',
        en: 'Looking to rent or let a home in Voorburg? Quiet, green living right next to The Hague, with the Vliet canal and a historic centre. Personal guidance from Karens Real Estate.',
      },
    },
    tagline: { nl: 'Rustig en groen wonen direct naast Den Haag, langs de Vliet.', en: 'Quiet, green living right next to The Hague, along the Vliet canal.' },
    intro: {
      nl: 'Voorburg ligt direct naast Den Haag en hoort bij de gemeente Leidschendam-Voorburg. Je woont hier dorps en groen, terwijl het centrum van Den Haag dichtbij blijft.',
      en: 'Voorburg lies right next to The Hague and is part of the municipality of Leidschendam-Voorburg. Life here feels like a village, green and calm, while the centre of The Hague stays close.',
    },
    character: {
      nl: 'Oud-Voorburg heeft een historisch centrum met de Herenstraat als winkelstraat. Langs de Vliet liggen fraaie buitenplaatsen, waaronder Hofwijck, het voormalige buitenhuis van Constantijn Huygens. Verder heeft Voorburg veel groene woonwijken en parken.',
      en: 'Old Voorburg has a historic centre with the Herenstraat as its shopping street. Along the Vliet canal there are fine country estates, including Hofwijck, the former country house of Constantijn Huygens. Voorburg also has many green residential areas and parks.',
    },
    housing: {
      nl: 'Voorburg biedt een mix van jaren-dertigwoningen, villa’s, eengezinswoningen met tuin en appartementen. Je hebt hier vaak meer ruimte en buitenruimte dan in de Haagse binnenstad.',
      en: 'Voorburg offers a mix of 1930s houses, villas, family homes with gardens and apartments. You often get more space, indoors and outdoors, than in the centre of The Hague.',
    },
    living: {
      nl: 'In de Herenstraat en de winkelcentra vind je alles voor de dagelijkse boodschappen. De Vliet en de parken nodigen uit tot wandelen en fietsen. Er zijn veel basisscholen en sportverenigingen.',
      en: 'The Herenstraat and local shopping centres have everything for daily needs. The Vliet and the parks invite you to walk and cycle, and there are many primary schools and sports clubs.',
    },
    access: {
      nl: 'Station Voorburg en station Den Haag Laan van NOI liggen in of tegen Voorburg aan. Tram en bus rijden naar het centrum van Den Haag, en de A4 en A12 zijn snel bereikbaar.',
      en: 'Voorburg station and Den Haag Laan van NOI station are in or right next to Voorburg. Trams and buses run to the centre of The Hague, and the A4 and A12 motorways are quickly reached.',
    },
    goodFor: {
      nl: ['Gezinnen die ruimte en rust zoeken', 'Forenzen met de auto of trein', 'Wie dorps wil wonen dicht bij de stad'],
      en: ['Families looking for space and peace', 'Commuters by car or train', 'Those who want village life close to the city'],
    },
    faq: {
      nl: [
        ['Hoort Voorburg bij Den Haag?', 'Nee, Voorburg hoort bij de gemeente Leidschendam-Voorburg, maar het ligt direct naast Den Haag en de grens merk je in het dagelijks leven nauwelijks.'],
        ['Waarom kiezen mensen voor Voorburg?', 'Vanwege de rust, het groen en de ruimere woningen, gecombineerd met de korte afstand tot Den Haag en de goede trein- en snelwegverbindingen.'],
      ],
      en: [
        ['Is Voorburg part of The Hague?', 'No, Voorburg is part of the municipality of Leidschendam-Voorburg, but it lies right next to The Hague and you hardly notice the boundary in daily life.'],
        ['Why do people choose Voorburg?', 'For its peace, greenery and more spacious homes, combined with the short distance to The Hague and good rail and motorway connections.'],
      ],
    },
    near: ['bezuidenhout', 'rijswijk', 'benoordenhout'],
  },
  {
    slug: 'rijswijk',
    name: { nl: 'Rijswijk', en: 'Rijswijk' },
    kind: 'plaats', municipality: 'Rijswijk', center: { lat: 52.036196, lon: 4.326032 }, zoom: 0.024,
    match: { wijken: [], cities: ['rijswijk'] },
    seo: {
      title: { nl: 'Huurwoning Rijswijk | Karens Real Estate', en: 'Renting in Rijswijk near The Hague | Karens Real Estate' },
      description: {
        nl: 'Een huurwoning zoeken of verhuren in Rijswijk? Ruim wonen direct naast Den Haag, met winkelcentrum In de Bogaard en goede verbindingen. Persoonlijk advies.',
        en: 'Looking to rent or let a home in Rijswijk? Spacious living right next to The Hague, with the In de Bogaard shopping centre and good connections. Personal advice.',
      },
    },
    tagline: { nl: 'Ruim en goed bereikbaar wonen, direct naast Den Haag.', en: 'Spacious, well-connected living right next to The Hague.' },
    intro: {
      nl: 'Rijswijk is een zelfstandige gemeente die direct aan Den Haag grenst. Je woont hier vaak ruimer dan in de stad, met goede verbindingen naar Den Haag, Delft en Rotterdam.',
      en: 'Rijswijk is a separate municipality bordering The Hague. You can often live more spaciously than in the city, with good connections to The Hague, Delft and Rotterdam.',
    },
    character: {
      nl: 'Rijswijk heeft een lange geschiedenis: in 1697 werd hier de Vrede van Rijswijk gesloten. Oud-Rijswijk heeft nog een dorps karakter, terwijl de andere wijken vooral uit naoorlogse en nieuwere woonwijken met veel groen bestaan.',
      en: 'Rijswijk has a long history: the Peace of Rijswijk was signed here in 1697. Old Rijswijk still has a village character, while the other neighbourhoods are mainly post-war and newer residential areas with plenty of greenery.',
    },
    housing: {
      nl: 'Het aanbod is breed: eengezinswoningen met tuin, appartementen en nieuwbouw. Voor gezinnen en wie meer ruimte zoekt, is Rijswijk een goed alternatief voor de Haagse binnenstad.',
      en: 'The range is broad: family homes with gardens, apartments and new builds. For families and anyone looking for more space, Rijswijk is a good alternative to the centre of The Hague.',
    },
    living: {
      nl: 'Winkelcentrum In de Bogaard is een van de grotere winkelcentra in de regio. Daarnaast heeft Rijswijk parken, sportvoorzieningen en scholen dichtbij.',
      en: 'The In de Bogaard shopping centre is one of the larger shopping centres in the region. Rijswijk also has parks, sports facilities and schools close by.',
    },
    access: {
      nl: 'Station Rijswijk ligt aan de lijn tussen Den Haag en Delft/Rotterdam. Trams rijden naar het centrum van Den Haag, en de A4 en A13 liggen vlakbij.',
      en: 'Rijswijk station is on the line between The Hague and Delft/Rotterdam. Trams run to the centre of The Hague, and the A4 and A13 motorways are close by.',
    },
    goodFor: {
      nl: ['Gezinnen die ruimte zoeken', 'Wie werkt in Den Haag, Delft of Rotterdam', 'Forenzen met de auto'],
      en: ['Families looking for space', 'Those working in The Hague, Delft or Rotterdam', 'Commuters by car'],
    },
    faq: {
      nl: [
        ['Is Rijswijk een goed alternatief voor Den Haag?', 'Voor veel mensen wel: je woont er vaak ruimer, met winkels en groen dichtbij, en het centrum van Den Haag is snel bereikbaar met tram of trein.'],
        ['Hoe snel ben ik vanuit Rijswijk in Delft of Rotterdam?', 'Vanaf station Rijswijk rijden treinen richting Delft en Rotterdam, en via de A4 en A13 ben je met de auto ook snel in de regio.'],
      ],
      en: [
        ['Is Rijswijk a good alternative to The Hague?', 'For many people it is: you often get more space, with shops and greenery nearby, and the centre of The Hague is quickly reached by tram or train.'],
        ['How quickly can I get to Delft or Rotterdam from Rijswijk?', 'Trains run from Rijswijk station towards Delft and Rotterdam, and the A4 and A13 motorways take you around the region quickly by car.'],
      ],
    },
    near: ['voorburg', 'regentessekwartier', 'centrum'],
  },
];

export const AREA_BY_SLUG = new Map(AREAS.map((a) => [a.slug, a]));

/** The area's name as used in a sentence ("in het Statenkwartier", "in de Archipelbuurt"). */
const REF: Record<string, { nl: string; en?: string }> = {
  statenkwartier: { nl: 'het Statenkwartier' },
  centrum: { nl: 'het centrum van Den Haag', en: 'the centre of The Hague' },
  regentessekwartier: { nl: 'het Regentessekwartier' },
  archipelbuurt: { nl: 'de Archipelbuurt' },
  zeeheldenkwartier: { nl: 'het Zeeheldenkwartier' },
  bezuidenhout: { nl: 'het Bezuidenhout' },
};
export const areaRef = (a: Area, lang: Lang) => REF[a.slug]?.[lang] ?? a.name[lang];

export const areaPath = (slug: string, lang: Lang) => (lang === 'nl' ? `/werkgebied/${slug}/` : `/en/areas/${slug}/`);

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Listings that belong to this area (by wijk from the feed/PDOK, or by city). */
export function matchesArea(area: Area, l: Pick<Listing, 'neighbourhood' | 'city'>): boolean {
  const wijk = norm(l.neighbourhood ?? ''), city = norm(l.city ?? '');
  if (area.match.cities.some((c) => city === c)) return true;
  const inDenHaag = city === 'den haag' || city === "'s-gravenhage";
  return inDenHaag && area.match.wijken.some((w) => new RegExp(`\\b${w}`).test(wijk));
}

/** Structured data for an area page: the Place itself. */
export function areaPlace(area: Area, url: string, lang: Lang) {
  return {
    '@type': 'Place',
    '@id': `${url}#place`,
    name: lang === 'nl' ? area.name.nl : area.name.en,
    description: area.intro[lang],
    geo: { '@type': 'GeoCoordinates', latitude: area.center.lat, longitude: area.center.lon },
    containedInPlace: area.kind === 'wijk'
      ? { '@type': 'City', name: lang === 'nl' ? 'Den Haag' : 'The Hague' }
      : { '@type': 'AdministrativeArea', name: area.municipality },
  };
}
