# Performance OS

Client dashboard van Flii. Frontend en GA4-proxy in één Vercel-project.
De root toont het dashboard, `api/ga` haalt Google Analytics data op, `api/report`
schrijft optioneel een rapport met jouw eigen Anthropic-sleutel.

## Structuur

```
public/index.html   het dashboard, geen build nodig
api/ga.js           GA4 proxy (service-account, batch, chunking van 5)
api/report.js       AI rapport via Anthropic (optioneel)
package.json        dependency voor api/ga.js
```

## Tabs

- Performance: Overzicht, Business, Marketing (kanalen en campagnes), Web. Scorecards met vergelijking tegenover de vorige periode, tabellen en grafieken. Alles uit echte GA4-data.
- Trends: zoekvolumes en Reddit top posts. Nu nog scaffold, wacht op een bron.
- Models: prognose van sessies (lineaire projectie), target instellen, voortgang.
- Insights: business insights, optimalisatielijst (berekend uit de data) en een gegenereerd maandrapport.

## Env vars in Vercel

- `GA_SERVICE_ACCOUNT` : volledige inhoud van het JSON key-bestand. Verplicht.
- `GA_PROPERTY_ID` : optioneel, standaard property.
- `GA_ALLOWED_PROPERTIES` : optioneel, komma-lijst van property id's die je toestaat. Aanrader zodra dit echt naar klanten gaat.
- `PROXY_SECRET` : optioneel wachtwoord voor de proxy.
- `ANTHROPIC_API_KEY` : optioneel, zet de maandrapporten aan.
- `CLAUDE_MODEL` : optioneel, standaard claude-sonnet-5. Voor goedkoper gebruik bijvoorbeeld claude-haiku-4-5-20251001.

Na het zetten of wijzigen van een env var opnieuw deployen.

## Klanten toevoegen

Bovenin `public/index.html` staat de lijst CLIENTS. Voeg per klant een regel toe met name en de GA4 property id. De klantkiezer bovenin het dashboard gebruikt die lijst.

## Belangrijk voor je het aan klanten geeft

Nu kan iedereen die de URL kent elke property opvragen die het service-account mag lezen. Zolang dit intern is, prima. Wil je klanten er zelf in laten, dan is een inlog per klant nodig zodat klant A niet de data van klant B ziet. Zet in de tussentijd `GA_ALLOWED_PROPERTIES` zodat alleen jouw eigen properties kunnen worden opgevraagd. De echte client-login bouw ik als losse stap.

## Roadmap

- Reddit top posts via Apify (env `APIFY_TOKEN`).
- Zoekvolumes via een SEO- of Trends-bron.
- Conversies en omzet per klant (keyEvents, purchaseRevenue) zodra we per property weten wat geldig is.
- Inlog per klant voor echte scheiding van data.
- PDF-export van het maandrapport.
