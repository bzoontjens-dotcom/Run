import { describe, expect, it } from 'vitest';
import {
  destination,
  distance,
  inEurope,
  pathLength,
  sampleAlong,
  simplify,
  totalAscent,
  trimSpurs,
} from '../src/lib/geo';
import { generateLoop, loopWaypoints, type Router } from '../src/lib/routing';
import { toGpx, toIcs } from '../src/lib/export';
import { agendaGroup, fmtDay, fmtDuration, fmtKm, fmtPace } from '../src/lib/format';
import { featureToPlace, flag } from '../src/lib/geocode';
import { matchCities } from '../src/lib/cities';
import { mergeResults } from '../src/components/SearchBar';
import { daysUntil, inForecastRange, pickHour } from '../src/lib/weather';
import type { LatLng, Session } from '../src/lib/types';

const AMSTERDAM: LatLng = [52.3728, 4.8936];
const PARIS: LatLng = [48.8566, 2.3522];

describe('geo', () => {
  it('meet de afstand Amsterdam–Parijs', () => {
    expect(distance(AMSTERDAM, PARIS) / 1000).toBeCloseTo(430, -1);
  });

  it('destination en distance zijn elkaars omgekeerde', () => {
    for (const bearing of [0, 73, 180, 291]) {
      expect(distance(AMSTERDAM, destination(AMSTERDAM, bearing, 2500))).toBeCloseTo(2500, 0);
    }
  });

  it('herkent wat binnen Europa valt', () => {
    expect(inEurope(AMSTERDAM)).toBe(true);
    expect(inEurope([64.1466, -21.9426])).toBe(true); // Reykjavik
    expect(inEurope([28.1235, -15.4363])).toBe(true); // Las Palmas
    expect(inEurope([40.7128, -74.006])).toBe(false); // New York
  });

  it('haalt heen-en-terug-uitstapjes uit een route', () => {
    const a: LatLng = [1, 1];
    const b: LatLng = [1, 2];
    const x: LatLng = [2, 2];
    const y: LatLng = [3, 2];
    const c: LatLng = [1, 3];
    const d: LatLng = [0, 3];
    expect(trimSpurs([a, b, x, y, x, b, c, d])).toEqual([a, b, c, d]);
    // dubbele punten achter elkaar tellen niet als uitstapje
    expect(trimSpurs([a, b, b, c, d])).toEqual([a, b, c, d]);
    // een route die alleen uit heen-en-terug bestaat blijft intact
    expect(trimSpurs([a, b, a])).toEqual([a, b, a]);
  });

  it('verdeelt punten gelijkmatig over een lijn', () => {
    const line: LatLng[] = [AMSTERDAM, destination(AMSTERDAM, 90, 1000), destination(AMSTERDAM, 90, 4000)];
    const samples = sampleAlong(line, 5);
    expect(samples).toHaveLength(5);
    for (let i = 1; i < samples.length; i++) {
      expect(distance(samples[i - 1], samples[i])).toBeCloseTo(1000, -1);
    }
  });

  it('vereenvoudigt een lijn zonder de vorm te verliezen', () => {
    const straight = Array.from({ length: 50 }, (_, i) => destination(AMSTERDAM, 45, i * 20));
    const corner = Array.from({ length: 50 }, (_, i) => destination(straight[49], 135, (i + 1) * 20));
    const simple = simplify([...straight, ...corner], 4);
    expect(simple.length).toBeLessThan(6);
    expect(pathLength(simple)).toBeCloseTo(pathLength([...straight, ...corner]), -1);
  });

  it('telt hoogtemeters en negeert meetruis', () => {
    expect(totalAscent([10, 11, 10, 12, 11, 10])).toBe(0);
    expect(totalAscent([10, 20, 15, 40])).toBe(35);
    expect(totalAscent([])).toBe(0);
  });
});

describe('rondje genereren', () => {
  // Nep-routeplanner: verbindt de punten hemelsbreed en maakt de route 30% langer dan dat,
  // zoals echte paden dat ruwweg ook doen.
  const fakeRouter: Router = async (points) => {
    const coords: LatLng[] = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const mid: LatLng = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.415, (a[1] + b[1]) / 2];
      coords.push(a, mid);
    }
    coords.push(points[points.length - 1]);
    return { coords, distance: pathLength(coords) };
  };

  it('legt de tussenpunten op een cirkel door het startpunt', () => {
    const radius = 1000;
    const center = destination(AMSTERDAM, 20, radius);
    const wps = loopWaypoints(AMSTERDAM, radius, 20, true);
    expect(wps).toHaveLength(3);
    for (const wp of wps) expect(distance(center, wp)).toBeCloseTo(radius, 0);
    // het middelste punt ligt recht tegenover de start
    expect(distance(AMSTERDAM, wps[1])).toBeCloseTo(2 * radius, 0);
  });

  it('komt binnen 5% van de gevraagde afstand uit en eindigt bij de start', async () => {
    for (const target of [3000, 10000, 21100]) {
      const loop = await generateLoop(AMSTERDAM, target, 0, fakeRouter);
      expect(Math.abs(loop.distance - target) / target).toBeLessThan(0.05);
      expect(loop.coords[0]).toEqual(AMSTERDAM);
      expect(loop.coords[loop.coords.length - 1]).toEqual(AMSTERDAM);
    }
  });

  it('geeft per variant een ander rondje', async () => {
    const a = await generateLoop(AMSTERDAM, 8000, 0, fakeRouter);
    const b = await generateLoop(AMSTERDAM, 8000, 1, fakeRouter);
    expect(a.coords[2]).not.toEqual(b.coords[2]);
  });

  it('probeert een kleinere cirkel als een route niet lukt', async () => {
    let calls = 0;
    const flaky: Router = async (points, signal) => {
      if (calls++ === 0) throw new Error('geen route');
      return fakeRouter(points, signal);
    };
    const loop = await generateLoop(AMSTERDAM, 5000, 0, flaky);
    expect(loop.distance).toBeGreaterThan(0);
  });

  it('meldt een fout als er helemaal geen route te vinden is', async () => {
    const broken: Router = async () => {
      throw new Error('geen route');
    };
    await expect(generateLoop(AMSTERDAM, 5000, 0, broken)).rejects.toThrow('geen route');
  });
});

const session: Session = {
  id: 'abc-123',
  title: 'Rondje Vondelpark & grachten',
  date: '2026-11-21',
  time: '08:00',
  type: 'easy',
  paceSec: 360,
  notes: 'Rustig aan; daarna koffie, croissant.',
  place: { name: 'Amsterdam', detail: 'Noord-Holland, Nederland', countryCode: 'NL', lat: 52.3728, lng: 4.8936 },
  route: { coords: [AMSTERDAM, [52.38, 4.9], AMSTERDAM], distance: 10000, ascent: 12, profile: [] },
  done: false,
  createdAt: 0,
};

describe('exporteren', () => {
  it('maakt een geldig GPX-spoor', () => {
    const gpx = toGpx(session);
    expect(gpx).toContain('<name>Rondje Vondelpark &amp; grachten</name>');
    expect(gpx.match(/<trkpt /g)).toHaveLength(3);
    expect(gpx).toContain('lat="52.372800" lon="4.893600"');
  });

  it('maakt een agenda-afspraak met lokale tijden en de juiste duur', () => {
    const ics = toIcs(session, new Date('2026-11-15T10:00:00Z'));
    expect(ics).toContain('DTSTART:20261121T080000\r\n');
    expect(ics).toContain('DTEND:20261121T090000\r\n'); // 10 km op 6:00 /km = 1 uur
    expect(ics).toContain('DTSTAMP:20261115T100000Z');
    expect(ics).toContain('LOCATION:Amsterdam\\, Noord-Holland\\, Nederland');
    // lange regels zijn doorgevouwen; ontvouwd staat de notitie er heel in
    expect(ics.replace(/\r\n /g, '')).toContain('Rustig aan\\; daarna koffie\\, croissant.');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('laat een late run over middernacht doorlopen', () => {
    const ics = toIcs({ ...session, time: '23:30' }, new Date('2026-11-15T10:00:00Z'));
    expect(ics).toContain('DTSTART:20261121T233000');
    expect(ics).toContain('DTEND:20261122T003000');
  });
});

describe('weergave', () => {
  it('schrijft afstand, duur en tempo op zijn Nederlands', () => {
    expect(fmtKm(8240)).toBe('8,24 km');
    expect(fmtKm(21097)).toBe('21,1 km');
    expect(fmtDuration(52 * 60)).toBe('52 min');
    expect(fmtDuration(65 * 60)).toBe('1 u 05');
    expect(fmtPace(330)).toBe('5:30');
  });

  it('noemt vandaag en morgen bij naam', () => {
    const now = new Date(2026, 10, 15); // zondag 15 november 2026
    expect(fmtDay('2026-11-15', now)).toBe('Vandaag');
    expect(fmtDay('2026-11-16', now)).toBe('Morgen');
    expect(fmtDay('2026-11-21', now)).toMatch(/21 nov/);
  });

  it('groepeert de agenda per week en maand', () => {
    const wednesday = new Date(2026, 10, 18);
    expect(agendaGroup('2026-11-18', wednesday)).toBe('Deze week');
    expect(agendaGroup('2026-11-22', wednesday)).toBe('Deze week'); // zondag
    expect(agendaGroup('2026-11-23', wednesday)).toBe('Volgende week'); // maandag
    expect(agendaGroup('2026-11-29', wednesday)).toBe('Volgende week');
    expect(agendaGroup('2026-12-05', wednesday)).toBe('December 2026');
  });
});

describe('zoeken', () => {
  it('vindt steden op hun Nederlandse naam, ook zonder accenten', () => {
    expect(matchCities('par')[0].name).toBe('Parijs');
    expect(matchCities('WEN')[0].name).toBe('Wenen');
    expect(matchCities('geneve')[0].name).toBe('Genève');
    expect(matchCities('')).toEqual([]);
  });

  it('zet een zoekresultaat om naar een plek', () => {
    const place = featureToPlace({
      properties: { name: 'Vondelpark', city: 'Amsterdam', state: 'Noord-Holland', country: 'Nederland', countrycode: 'NL' },
      geometry: { coordinates: [4.8683, 52.358] },
    });
    expect(place).toMatchObject({
      name: 'Vondelpark',
      detail: 'Amsterdam, Noord-Holland, Nederland',
      countryCode: 'NL',
      lat: 52.358,
      lng: 4.8683,
    });
    // stad en provincie met dezelfde naam worden niet herhaald
    const utrecht = featureToPlace({
      properties: { name: 'Utrecht', state: 'Utrecht', country: 'Nederland', countrycode: 'NL' },
      geometry: { coordinates: [5.12, 52.09] },
    });
    expect(utrecht.detail).toBe('Nederland');
  });

  it('toont elke plek één keer, met bekende steden bovenaan', () => {
    const place = (name: string, detail: string, kind: string, lat: number, lng: number) => ({ name, detail, kind, lat, lng });
    const merged = mergeResults(matchCities('par'), [
      place('Par', 'England, United Kingdom', 'city', 50.349, -4.705),
      place('Paris', 'Île-de-France, France', 'city', 48.853, 2.348),
      place('Paris', 'Île-de-France, France', 'district', 48.859, 2.32),
      place('Parma', 'Emilia-Romagna, Italia', 'county', 44.695, 10.098),
      place('Parma', 'Emilia-Romagna, Italia', 'city', 44.801, 10.328),
    ]);
    expect(merged.map((p) => p.name)).toEqual(['Parijs', 'Par', 'Parma']);
    expect(merged[2].kind).toBe('city');
  });

  it('maakt een vlag van een landcode', () => {
    expect(flag('NL')).toBe('🇳🇱');
    expect(flag(undefined)).toBe('');
  });
});

describe('weer', () => {
  const now = new Date(2026, 10, 15);

  it('weet of een datum binnen de verwachting valt', () => {
    expect(daysUntil('2026-11-21', now)).toBe(6);
    expect(inForecastRange('2026-11-15', now)).toBe(true);
    expect(inForecastRange('2026-11-29', now)).toBe(true);
    expect(inForecastRange('2026-11-30', now)).toBe(false);
    expect(inForecastRange('2026-11-14', now)).toBe(false);
  });

  it('kiest het uur van de starttijd', () => {
    const hourly = {
      time: ['2026-11-21T07:00', '2026-11-21T08:00', '2026-11-21T09:00'],
      temperature_2m: [5.2, 6.6, 8.1],
      precipitation_probability: [10, 35, 60],
      weather_code: [1, 61, 3],
      wind_speed_10m: [9.4, 14.6, 18],
    };
    expect(pickHour(hourly, '08:30')).toEqual({ tempC: 7, rainChance: 35, windKmh: 15, code: 61 });
    expect(pickHour(hourly, '12:00')).toBeNull();
  });
});
