# Flii GA4 proxy

Kleine Vercel-functie die Google Analytics 4 data ophaalt met een service-account.
De frontend (het artifact) praat alleen met deze functie, dus geen tokens in de browser.

## Wat je krijgt

`POST /api/ga` met body:

```json
{
  "propertyId": "123456789",
  "reports": [ { "dateRanges": [...], "metrics": [...], "dimensions": [...] } ]
}
```

Antwoord is de ruwe GA4 batchRunReports respons.

## Setup (eenmalig)

1. Ga naar console.cloud.google.com, maak een project.
2. Zet de "Google Analytics Data API" aan onder APIs and Services.
3. Maak een service account. Maak een JSON key aan en download die.
4. Open de GA4 property, Admin, Property access management. Voeg het e-mailadres van het service account toe als Viewer (Lezer). Dit kan ook in de Google Analytics app op je telefoon.
5. Nieuwe GitHub repo met deze bestanden. Push via je normale API-flow.
6. Koppel de repo aan Vercel.
7. Zet in Vercel onder Settings, Environment Variables:
   - `GA_SERVICE_ACCOUNT` : de volledige inhoud van het JSON key-bestand, in een keer geplakt.
   - `GA_PROPERTY_ID` : optioneel, een standaard property id.
   - `PROXY_SECRET` : optioneel, een zelfgekozen wachtwoord. Zet je die, stuur dan dezelfde waarde mee in de header `x-proxy-secret`.
8. Deploy. Je endpoint is dan `https://JOUWPROJECT.vercel.app/api/ga`.
9. Plak die URL in het artifact.

## Let op

Het endpoint is publiek. De service account ziet alleen properties die jij hem als Viewer hebt gegeven, dus de schade blijft beperkt tot lezen van jouw eigen data. Wil je het dichttimmeren, zet dan `PROXY_SECRET`. Die waarde staat wel in het artifact, dus het is een drempel, geen kluis. Voor een interne bureautool is dat prima.

## Property id vinden

GA4 Admin, Property Settings, bovenaan staat de Property ID, een getal van negen cijfers. Dat getal gebruik je, niet het meetnummer dat met G begint.
