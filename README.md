# Run — hardlopen door Europa

Een app voor op je iPhone waarmee je hardloopsessies plant, waar in Europa je ook bent.
Kies een plek, laat een rondje van de gewenste lengte maken (of teken zelf een route) en
zet de run met datum, tijd en soort training in je agenda.

## Wat kan de app

- **Overal in Europa plannen** — zoek een stad, park of adres, tik op de kaart of gebruik je eigen locatie.
- **Rondje op afstand** — kies 2 tot 45 km en de app maakt een rondje over voet- en fietspaden dat bij je
  startpunt begint en eindigt. Niet tevreden? "Ander rondje" geeft een nieuwe variant.
- **Zelf tekenen** — tik punten op de kaart; de route volgt de paden ertussen.
- **Sessie plannen** — datum, starttijd, soort training (duurloop, tempo, interval, …), tempo en notities.
- **Agenda** — al je geplande runs per week, met de weersverwachting voor het startmoment.
- **Details** — kaart met kilometerpaaltjes, hoogteprofiel, geschatte duur.
- **Exporteren** — zet de run in je iPhone-agenda (.ics) of deel de route als GPX met je horloge of Strava/Komoot.

Je sessies worden alleen op je eigen toestel bewaard; er is geen account en geen server.

## Op je iPhone zetten

De app is een web-app die je als app op je beginscherm zet:

1. Open het adres van de app in **Safari**.
2. Tik op de deelknop en kies **Zet op beginscherm**.
3. Start de app voortaan via het icoon; hij opent dan schermvullend, zonder adresbalk.

## Ontwikkelen

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` zet de app klaar in `dist/`; die map kan op elke statische webhost (bijv. Netlify) worden gezet.
De app moet via **https** bereikbaar zijn, anders werken locatie en installeren niet.

## Gebruikte diensten

De app haalt gegevens rechtstreeks op bij deze openbare diensten (geen sleutels nodig):

| Waarvoor | Dienst |
| --- | --- |
| Kaart | OpenStreetMap-tegels |
| Plaatsen zoeken | Photon (Komoot), op OpenStreetMap-gegevens |
| Looproutes | OSRM-voetgangersprofiel van FOSSGIS (`routing.openstreetmap.de`) |
| Weer en hoogte | Open-Meteo |

Deze diensten zijn bedoeld voor persoonlijk, bescheiden gebruik. Wordt de app door veel mensen gebruikt,
dan zijn eigen of betaalde diensten nodig.

## Opbouw

- `src/lib/` — rekenwerk en gegevens: afstanden, rondjes maken, zoeken, weer, opslag, export.
- `src/components/` — de schermen: plannen (kaart), formulier, agenda en details.
- `tests/` — tests voor het rekenwerk.
