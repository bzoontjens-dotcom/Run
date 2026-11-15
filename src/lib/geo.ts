import type { LatLng } from './types';

const R = 6371000; // straal van de aarde in meters
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Het gebied dat de app bestrijkt: Europa inclusief IJsland, de Canarische Eilanden en de Azoren. */
export const EUROPE_BOUNDS = { south: 27, west: -32, north: 72, east: 45 } as const;

export function inEurope([lat, lng]: LatLng): boolean {
  const b = EUROPE_BOUNDS;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

/** Afstand in meters tussen twee punten (haversine). */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Lengte van een lijn in meters. */
export function pathLength(coords: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += distance(coords[i - 1], coords[i]);
  return total;
}

/** Punt op `meters` afstand van `from` in kompasrichting `bearingDeg`. */
export function destination(from: LatLng, bearingDeg: number, meters: number): LatLng {
  const d = meters / R;
  const b = rad(bearingDeg);
  const lat1 = rad(from[0]);
  const lng1 = rad(from[1]);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [deg(lat2), ((deg(lng2) + 540) % 360) - 180];
}

const same = (a: LatLng, b: LatLng) => a[0] === b[0] && a[1] === b[1];

/**
 * Haalt doodlopende uitstapjes uit een route: stukken waar de lijn naar een punt
 * loopt en over precies dezelfde weg terugkomt (A → X → A wordt A).
 */
export function trimSpurs(coords: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const c of coords) {
    const n = out.length;
    if (n >= 1 && same(out[n - 1], c)) continue;
    if (n >= 2 && same(out[n - 2], c)) {
      out.pop();
      continue;
    }
    out.push(c);
  }
  // Een route die volledig heen-en-terug is zou verdwijnen; geef dan het origineel terug.
  return out.length >= 3 ? out : coords;
}

/** `count` punten gelijkmatig verdeeld over de lijn (inclusief begin en eind). */
export function sampleAlong(coords: LatLng[], count: number): LatLng[] {
  if (coords.length <= 1 || count <= 1) return coords.slice(0, 1);
  const total = pathLength(coords);
  if (total === 0) return [coords[0]];
  const step = total / (count - 1);
  const out: LatLng[] = [coords[0]];
  let walked = 0;
  let next = step;
  for (let i = 1; i < coords.length && out.length < count - 1; i++) {
    const seg = distance(coords[i - 1], coords[i]);
    while (seg > 0 && walked + seg >= next && out.length < count - 1) {
      const t = (next - walked) / seg;
      out.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ]);
      next += step;
    }
    walked += seg;
  }
  out.push(coords[coords.length - 1]);
  return out;
}

/** Vereenvoudigt een lijn (Douglas-Peucker) met een tolerantie in meters. */
export function simplify(coords: LatLng[], toleranceM = 4): LatLng[] {
  if (coords.length <= 2) return coords.slice();
  const lat0 = rad(coords[0][0]);
  // Lokale projectie naar meters; nauwkeurig genoeg op de schaal van één route.
  const xy = coords.map(([lat, lng]) => [rad(lng) * Math.cos(lat0) * R, rad(lat) * R] as const);
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstDist = toleranceM * toleranceM;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const ex = px - (ax + t * dx);
      const ey = py - (ay + t * dy);
      const d2 = ex * ex + ey * ey;
      if (d2 > worstDist) {
        worstDist = d2;
        worst = i;
      }
    }
    if (worst !== -1) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

/** Rondt coördinaten af op ~1 meter om opslag te besparen. */
export function roundCoords(coords: LatLng[]): LatLng[] {
  return coords.map(([lat, lng]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
}

/** Totaal aantal meters klimmen in een hoogteprofiel, met een drempel tegen meetruis. */
export function totalAscent(profile: number[], threshold = 3): number {
  if (profile.length < 2) return 0;
  let ascent = 0;
  let anchor = profile[0];
  for (const h of profile) {
    if (h > anchor + threshold) {
      ascent += h - anchor;
      anchor = h;
    } else if (h < anchor) {
      anchor = h;
    }
  }
  return Math.round(ascent);
}

/** Punten op elke `stepM` meter langs de lijn (zonder het startpunt), voor kilometerpaaltjes. */
export function pointsEvery(coords: LatLng[], stepM: number): LatLng[] {
  const out: LatLng[] = [];
  if (stepM <= 0) return out;
  let walked = 0;
  let next = stepM;
  for (let i = 1; i < coords.length; i++) {
    const seg = distance(coords[i - 1], coords[i]);
    while (seg > 0 && walked + seg >= next) {
      const t = (next - walked) / seg;
      out.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ]);
      next += stepM;
    }
    walked += seg;
  }
  return out;
}
