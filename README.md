# Performance OS

Client dashboard van Flii. Vite plus React frontend en twee Vercel-functies in één project.
De root toont het dashboard, `api/ga` haalt Google Analytics data op, `api/report`
schrijft optioneel een rapport met jouw eigen Anthropic-sleutel.

## Stack

- Vite plus React, geen Tailwind
- ECharts voor de grafieken (Flii-thema in magenta en violet)
- TanStack Table voor sorteerbare tabellen
- Vercel serverless functions voor de data en het rapport

## Structuur

```
index.html            Vite entry
vite.config.js
package.json
src/
  main.jsx
  App.jsx             header, klant, periode, tabs, dataladen
  data.js             klanten, GA rapportdefinities, parsing, formatters, prognose
  charts.js           ECharts option-builders
  echartsSetup.js     Flii-thema
  styles.css          design tokens en layout
  components/         Chart, DataTable, Scorecard, Bars
  tabs/               Performance, Trends, Models, Insights
api/
  ga.js               GA4 proxy (service-account, batch, chunking van 5)
  report.js           AI rapport via Anthropic (optioneel)
```

## Lokaal draaien

```
npm install
npm run dev
```

Bouwen doet Vercel automatisch met `npm run build`, output in `dist`.

## Tabs

- Performance: Overzicht, Business, Marketing (kanalen en campagnes), Web. Scorecards met vergelijking tegenover de vorige periode, sorteerbare tabellen, grafieken en een activiteitsheatmap per dag en uur. Alles uit echte GA4-data.
- Trends: zoekvolumes en Reddit top posts. Nu nog scaffold, wacht op een bron.
- Models: prognose van sessies (lineaire projectie), target instellen, voortgang.
- Insights: business insights, optimalisatielijst (berekend) en een gegenereerd maandrapport.

## Env vars in Vercel

- `GA_SERVICE_ACCOUNT` : volledige inhoud van het JSON key-bestand. Verplicht.
- `GA_PROPERTY_ID` : optioneel, standaard property.
- `GA_ALLOWED_PROPERTIES` : optioneel, komma-lijst van toegestane property id's. Aanrader richting klanten.
- `PROXY_SECRET` : optioneel wachtwoord voor de proxy.
- `ANTHROPIC_API_KEY` : optioneel, zet de maandrapporten aan.
- `CLAUDE_MODEL` : optioneel, standaard claude-sonnet-5. Goedkoper bijvoorbeeld claude-haiku-4-5-20251001.

Na het zetten of wijzigen van een env var opnieuw deployen.

## Klanten toevoegen

In `src/data.js` staat de lijst CLIENTS. Voeg per klant een regel toe met name en de GA4 property id.

## Voordat het aan klanten gaat

Nu kan iedereen met de URL elke property opvragen die het service-account mag lezen. Zet `GA_ALLOWED_PROPERTIES` zolang het intern is. Echte scheiding vraagt een inlog per klant, dat is de volgende bouwstap.

## Roadmap

- Reddit top posts via Apify (env APIFY_TOKEN).
- Zoekvolumes via een SEO- of Trends-bron.
- Conversies en omzet per klant zodra we per property weten wat geldig is.
- Inlog per klant voor echte scheiding van data.
- PDF-export van het maandrapport.
