import type { Place } from './types';

type Row = [name: string, country: string, countryCode: string, lat: number, lng: number];

/** Bekende hardloopsteden met hun Nederlandse naam, zodat zoeken op "Parijs" of "Wenen" direct werkt. */
const ROWS: Row[] = [
  ['Amsterdam', 'Nederland', 'NL', 52.3728, 4.8936],
  ['Rotterdam', 'Nederland', 'NL', 51.9225, 4.4792],
  ['Utrecht', 'Nederland', 'NL', 52.0907, 5.1214],
  ['Den Haag', 'Nederland', 'NL', 52.0705, 4.3007],
  ['Brussel', 'België', 'BE', 50.8467, 4.3525],
  ['Antwerpen', 'België', 'BE', 51.2194, 4.4025],
  ['Gent', 'België', 'BE', 51.0543, 3.7174],
  ['Luxemburg', 'Luxemburg', 'LU', 49.6116, 6.1319],
  ['Parijs', 'Frankrijk', 'FR', 48.8566, 2.3522],
  ['Lyon', 'Frankrijk', 'FR', 45.764, 4.8357],
  ['Marseille', 'Frankrijk', 'FR', 43.2965, 5.3698],
  ['Nice', 'Frankrijk', 'FR', 43.7102, 7.262],
  ['Bordeaux', 'Frankrijk', 'FR', 44.8378, -0.5792],
  ['Londen', 'Verenigd Koninkrijk', 'GB', 51.5074, -0.1278],
  ['Edinburgh', 'Verenigd Koninkrijk', 'GB', 55.9533, -3.1883],
  ['Manchester', 'Verenigd Koninkrijk', 'GB', 53.4808, -2.2426],
  ['Dublin', 'Ierland', 'IE', 53.3498, -6.2603],
  ['Berlijn', 'Duitsland', 'DE', 52.52, 13.405],
  ['München', 'Duitsland', 'DE', 48.1351, 11.582],
  ['Hamburg', 'Duitsland', 'DE', 53.5511, 9.9937],
  ['Keulen', 'Duitsland', 'DE', 50.9375, 6.9603],
  ['Frankfurt', 'Duitsland', 'DE', 50.1109, 8.6821],
  ['Wenen', 'Oostenrijk', 'AT', 48.2082, 16.3738],
  ['Salzburg', 'Oostenrijk', 'AT', 47.8095, 13.055],
  ['Zürich', 'Zwitserland', 'CH', 47.3769, 8.5417],
  ['Genève', 'Zwitserland', 'CH', 46.2044, 6.1432],
  ['Praag', 'Tsjechië', 'CZ', 50.0755, 14.4378],
  ['Boedapest', 'Hongarije', 'HU', 47.4979, 19.0402],
  ['Warschau', 'Polen', 'PL', 52.2297, 21.0122],
  ['Krakau', 'Polen', 'PL', 50.0647, 19.945],
  ['Bratislava', 'Slowakije', 'SK', 48.1486, 17.1077],
  ['Ljubljana', 'Slovenië', 'SI', 46.0569, 14.5058],
  ['Zagreb', 'Kroatië', 'HR', 45.815, 15.9819],
  ['Split', 'Kroatië', 'HR', 43.5081, 16.4402],
  ['Dubrovnik', 'Kroatië', 'HR', 42.6507, 18.0944],
  ['Kopenhagen', 'Denemarken', 'DK', 55.6761, 12.5683],
  ['Stockholm', 'Zweden', 'SE', 59.3293, 18.0686],
  ['Göteborg', 'Zweden', 'SE', 57.7089, 11.9746],
  ['Oslo', 'Noorwegen', 'NO', 59.9139, 10.7522],
  ['Bergen', 'Noorwegen', 'NO', 60.3913, 5.3221],
  ['Helsinki', 'Finland', 'FI', 60.1699, 24.9384],
  ['Tallinn', 'Estland', 'EE', 59.437, 24.7536],
  ['Riga', 'Letland', 'LV', 56.9496, 24.1052],
  ['Vilnius', 'Litouwen', 'LT', 54.6872, 25.2797],
  ['Reykjavik', 'IJsland', 'IS', 64.1466, -21.9426],
  ['Madrid', 'Spanje', 'ES', 40.4168, -3.7038],
  ['Barcelona', 'Spanje', 'ES', 41.3874, 2.1686],
  ['Valencia', 'Spanje', 'ES', 39.4699, -0.3763],
  ['Sevilla', 'Spanje', 'ES', 37.3891, -5.9845],
  ['Lissabon', 'Portugal', 'PT', 38.7223, -9.1393],
  ['Porto', 'Portugal', 'PT', 41.1579, -8.6291],
  ['Rome', 'Italië', 'IT', 41.9028, 12.4964],
  ['Milaan', 'Italië', 'IT', 45.4642, 9.19],
  ['Florence', 'Italië', 'IT', 43.7696, 11.2558],
  ['Venetië', 'Italië', 'IT', 45.4408, 12.3155],
  ['Napels', 'Italië', 'IT', 40.8518, 14.2681],
  ['Turijn', 'Italië', 'IT', 45.0703, 7.6869],
  ['Valletta', 'Malta', 'MT', 35.8989, 14.5146],
  ['Athene', 'Griekenland', 'GR', 37.9838, 23.7275],
  ['Thessaloniki', 'Griekenland', 'GR', 40.6401, 22.9444],
  ['Boekarest', 'Roemenië', 'RO', 44.4268, 26.1025],
  ['Sofia', 'Bulgarije', 'BG', 42.6977, 23.3219],
  ['Belgrado', 'Servië', 'RS', 44.7866, 20.4489],
  ['Istanbul', 'Turkije', 'TR', 41.0082, 28.9784],
];

export const CITIES: Place[] = ROWS.map(([name, country, countryCode, lat, lng]) => ({
  name,
  detail: country,
  country,
  countryCode,
  lat,
  lng,
}));

/** Steden die als snelkeuze onder de zoekbalk staan. */
export const FEATURED = [
  'Amsterdam',
  'Parijs',
  'Berlijn',
  'Londen',
  'Barcelona',
  'Rome',
  'Lissabon',
  'Kopenhagen',
  'Wenen',
  'Praag',
  'Stockholm',
  'Athene',
].map((name) => CITIES.find((c) => c.name === name)!);

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Steden waarvan de naam met de zoekterm begint (accenten en hoofdletters tellen niet mee). */
export function matchCities(query: string, limit = 4): Place[] {
  const q = fold(query.trim());
  if (!q) return [];
  return CITIES.filter((c) => fold(c.name).startsWith(q)).slice(0, limit);
}
