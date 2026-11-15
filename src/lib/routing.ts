import { destination, pathLength, trimSpurs } from './geo';
import type { LatLng } from './types';

/** Looproutes over voet- en fietspaden, op basis van OpenStreetMap (FOSSGIS OSRM-server). */
const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/';

export interface RoutedPath {
  coords: LatLng[];
  distance: number;
}

export type Router = (points: LatLng[], signal?: AbortSignal) => Promise<RoutedPath>;

export class RouteError extends Error {}

export const routeVia: Router = async (points, signal) => {
  if (points.length < 2) return { coords: points.slice(), distance: 0 };
  const path = points.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  let res: Response;
  try {
    res = await fetch(`${OSRM_FOOT}${path}?overview=full&geometries=geojson&continue_straight=false`, {
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new RouteError('Geen verbinding met de routeplanner. Controleer je internet.');
  }
  if (res.status === 429) throw new RouteError('De routeplanner is even druk. Probeer het zo opnieuw.');
  const data = await res.json().catch(() => null);
  const route = data?.routes?.[0];
  if (!res.ok || data?.code !== 'Ok' || !route) {
    throw new RouteError('Hier is geen looproute te vinden. Kies een punt dichter bij een weg of pad.');
  }
  const coords: LatLng[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  return { coords, distance: route.distance };
};

/**
 * Tussenpunten voor een rondje: drie punten op een cirkel die door het startpunt gaat.
 * `headingDeg` bepaalt welke kant de cirkel op ligt, `clockwise` de looprichting.
 */
export function loopWaypoints(
  start: LatLng,
  radiusM: number,
  headingDeg: number,
  clockwise: boolean,
): LatLng[] {
  const center = destination(start, headingDeg, radiusM);
  const backToStart = (headingDeg + 180) % 360;
  const sign = clockwise ? 1 : -1;
  return [1, 2, 3].map((i) => destination(center, backToStart + sign * i * 90, radiusM));
}

/** Richting en looprichting voor de zoveelste variant van een rondje. */
export function variantShape(variant: number): { heading: number; clockwise: boolean } {
  return { heading: (variant * 50 + 20) % 360, clockwise: variant % 2 === 0 };
}

/**
 * Maakt een rondje van ongeveer `targetM` meter dat begint en eindigt in `start`.
 * De cirkel wordt stap voor stap groter of kleiner gemaakt tot de echte route over
 * paden dicht genoeg bij de gewenste afstand ligt.
 */
export async function generateLoop(
  start: LatLng,
  targetM: number,
  variant = 0,
  router: Router = routeVia,
  signal?: AbortSignal,
): Promise<RoutedPath> {
  const { heading, clockwise } = variantShape(variant);
  // Een vierkant in de cirkel heeft omtrek ~5,66·r; paden zijn ruwweg een derde langer dan hemelsbreed.
  let radius = targetM / 7.5;
  let best: (RoutedPath & { error: number }) | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    let routed: RoutedPath;
    try {
      routed = await router([start, ...loopWaypoints(start, radius, heading, clockwise), start], signal);
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      lastError = err;
      // Tussenpunten kunnen in zee of onbereikbaar gebied vallen: probeer een kleinere cirkel.
      radius *= 0.7;
      continue;
    }
    const coords = trimSpurs(routed.coords);
    const dist = pathLength(coords);
    if (dist <= 0) {
      radius *= 1.5;
      continue;
    }
    const error = Math.abs(dist - targetM) / targetM;
    if (!best || error < best.error) best = { coords, distance: dist, error };
    if (error < 0.04) break;
    radius *= Math.max(0.5, Math.min(2, targetM / dist));
  }

  if (!best) throw lastError ?? new RouteError('Er kon geen rondje worden gemaakt vanaf dit punt.');
  return { coords: best.coords, distance: best.distance };
}
