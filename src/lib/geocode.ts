import { EUROPE_BOUNDS } from './geo';
import type { LatLng, Place } from './types';

/** Plaatsen zoeken via Photon (OpenStreetMap-gegevens, gehost door Komoot). */
const PHOTON = 'https://photon.komoot.io';

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  type?: string;
}

interface PhotonFeature {
  properties: PhotonProps;
  geometry: { coordinates: [number, number] };
}

export function featureToPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const street = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : undefined;
  const name = p.name ?? street ?? p.locality ?? p.district ?? p.city ?? p.county ?? 'Onbekende plek';
  const detail = [p.city, p.state, p.country]
    .filter((part, i, all): part is string => !!part && part !== name && all.indexOf(part) === i)
    .join(', ');
  const [lng, lat] = f.geometry.coordinates;
  return { name, detail, country: p.country, countryCode: p.countrycode?.toUpperCase(), kind: p.type, lat, lng };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const b = EUROPE_BOUNDS;
  const url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=6&bbox=${b.west},${b.south},${b.east},${b.north}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Zoeken is nu niet beschikbaar.');
  const data = await res.json();
  return (data.features as PhotonFeature[]).map(featureToPlace);
}

/** Naam van de plek bij een coördinaat; valt terug op de coördinaat zelf. */
export async function reverseGeocode([lat, lng]: LatLng, signal?: AbortSignal): Promise<Place> {
  const fallback: Place = { name: 'Gekozen punt', detail: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
  try {
    const res = await fetch(`${PHOTON}/reverse?lon=${lng}&lat=${lat}&limit=1`, { signal });
    if (!res.ok) return fallback;
    const data = await res.json();
    const feature = (data.features as PhotonFeature[])[0];
    if (!feature) return fallback;
    // Houd het gekozen punt aan; alleen de naam komt van de dichtstbijzijnde plek.
    return { ...featureToPlace(feature), lat, lng };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return fallback;
  }
}

/** Vlag-emoji bij een landcode van twee letters. */
export function flag(countryCode?: string): string {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) return '';
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
