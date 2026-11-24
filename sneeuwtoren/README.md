# Sneeuwtoren

Het ski-spel van Felix en Tommy. Tik zo snel als je kunt op SPEED, vlieg van de schans en
verdien geld met hoge sprongen. Met dat geld koop je snellere ski's en een hogere berg,
tot de Sneeuwtoren van 20.000 meter.

## Spelregels

| Onderdeel | Hoe het werkt |
| --- | --- |
| Speed | Elke tik geeft speed; stop je met tikken, dan zakt die weer. Na ruim vijf seconden komt de schans. |
| Sprong | Hoogte = hoogte van de berg × speed ÷ 400. Elke meter levert € 10 op. |
| Ski's | 20 niveaus. Elk niveau geeft +5 speed per tik en +50 maximumspeed, tot 1.000. Prijs: 150 × niveau². |
| Berg | Per keer 100 m hoger, van 100 m tot 20.000 m. De eerste stap kost € 1.000, elke volgende € 1.000 meer. |
| Spelers | Felix en Tommy hebben elk hun eigen geld, ski's, berg en records. |

## Bewaren op elk apparaat

De voortgang staat op het apparaat zelf en, met de **spelcode**, ook op de server. Zo is de
stand op elke telefoon, tablet en computer gelijk. De spelcode zit in de link
(`…/#spel=CODE`) of vul je één keer in via het scorebord. Per speler wint de stand met de
meeste wijzigingen.

De code zelf staat niet in deze repository: hij is bij de Netlify-site ingesteld als
omgevingsvariabele `SPELCODE`.

## Opbouw

- `public/index.html` — het hele spel: tekenwerk, geluid, spelregels en schermen.
- `netlify/functions/save.mts` — bewaart en haalt de voortgang op (Netlify Blobs).
- `netlify.toml` — instellingen voor de hosting.
- `scripts/make-icons.cjs` — maakt de iconen voor het beginscherm uit `public/icon.svg`.

## Online zetten

De map `sneeuwtoren` is een eigen Netlify-site. Stel bij die site de omgevingsvariabele
`SPELCODE` in (bereik: Functions) en rol daarna uit; de waarde wordt per uitrol vastgelegd.
