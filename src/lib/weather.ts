import type { LatLng } from './types';

/** Weersverwachting via Open-Meteo (gratis, geen sleutel nodig). */
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ELEVATION = 'https://api.open-meteo.com/v1/elevation';

export interface Forecast {
  tempC: number;
  rainChance: number | null;
  windKmh: number;
  code: number;
}

/** Aantal dagen tussen vandaag en `date` (JJJJ-MM-DD); negatief als het in het verleden ligt. */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}

/** Verwachtingen lopen tot ongeveer twee weken vooruit. */
export function inForecastRange(date: string, now = new Date()): boolean {
  const days = daysUntil(date, now);
  return days >= 0 && days <= 14;
}

/** Kiest uit de uurverwachting van één dag het uur van de starttijd. */
export function pickHour(
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: (number | null)[];
    weather_code: number[];
    wind_speed_10m: number[];
  },
  time: string,
): Forecast | null {
  const hour = time.slice(0, 2);
  const i = hourly.time.findIndex((t) => t.slice(11, 13) === hour);
  if (i === -1 || hourly.temperature_2m[i] == null) return null;
  return {
    tempC: Math.round(hourly.temperature_2m[i]),
    rainChance: hourly.precipitation_probability?.[i] ?? null,
    windKmh: Math.round(hourly.wind_speed_10m[i]),
    code: hourly.weather_code[i],
  };
}

const cache = new Map<string, Promise<Forecast | null>>();

export function getForecast(lat: number, lng: number, date: string, time: string): Promise<Forecast | null> {
  if (!inForecastRange(date)) return Promise.resolve(null);
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${date},${time.slice(0, 2)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      const url =
        `${FORECAST}?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
        `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
        `&start_date=${date}&end_date=${date}&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('weer niet beschikbaar');
      const data = await res.json();
      return pickHour(data.hourly, time);
    })().catch(() => {
      cache.delete(key); // volgende keer opnieuw proberen
      return null;
    });
    cache.set(key, hit);
  }
  return hit;
}

/** Hoogte in meters voor maximaal 100 punten. */
export async function getElevations(points: LatLng[], signal?: AbortSignal): Promise<number[]> {
  const lat = points.map((p) => p[0].toFixed(5)).join(',');
  const lng = points.map((p) => p[1].toFixed(5)).join(',');
  const res = await fetch(`${ELEVATION}?latitude=${lat}&longitude=${lng}`, { signal });
  if (!res.ok) throw new Error('hoogte niet beschikbaar');
  const data = await res.json();
  if (!Array.isArray(data.elevation)) throw new Error('hoogte niet beschikbaar');
  return data.elevation as number[];
}

/** WMO-weercode naar een icoon en een korte Nederlandse omschrijving. */
export function describeWeather(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Zonnig' };
  if (code === 1) return { icon: '🌤️', label: 'Overwegend zonnig' };
  if (code === 2) return { icon: '⛅', label: 'Half bewolkt' };
  if (code === 3) return { icon: '☁️', label: 'Bewolkt' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Mist' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Motregen' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Regen' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Sneeuw' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'Buien' };
  if (code === 85 || code === 86) return { icon: '🌨️', label: 'Sneeuwbuien' };
  if (code >= 95) return { icon: '⛈️', label: 'Onweer' };
  return { icon: '🌡️', label: 'Wisselend' };
}
