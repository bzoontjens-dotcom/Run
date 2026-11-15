import { fmtKm, fmtPace } from './format';
import { typeLabel, type Session } from './types';

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** De route als GPX-bestand, te openen in o.a. Garmin Connect, Strava en Komoot. */
export function toGpx(session: Session): string {
  const points = session.route.coords
    .map(([lat, lng]) => `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"/>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Run" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${xml(session.title)}</name>
  </metadata>
  <trk>
    <name>${xml(session.title)}</name>
    <type>running</type>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

const icsText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Regels in een agendabestand mogen maximaal 75 bytes lang zijn; langere worden doorgevouwen. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // vervolgregels beginnen met een spatie
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

/** Geschatte duur in seconden op basis van afstand en tempo. */
export function durationSec(session: Pick<Session, 'route' | 'paceSec'>): number {
  return (session.route.distance / 1000) * session.paceSec;
}

/** Eindtijd als lokale datum en tijd, ook als de run over middernacht gaat. */
function endOf(session: Session): { date: string; time: string } {
  const [y, m, d] = session.date.split('-').map(Number);
  const [hh, mm] = session.time.split(':').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d, hh, mm) + Math.max(60, durationSec(session)) * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${end.getUTCFullYear()}-${p(end.getUTCMonth() + 1)}-${p(end.getUTCDate())}`,
    time: `${p(end.getUTCHours())}:${p(end.getUTCMinutes())}`,
  };
}

/**
 * De sessie als agenda-afspraak (.ics). Tijden staan er zonder tijdzone in, zodat
 * 08:00 ook 08:00 blijft op de plek waar je op dat moment bent.
 */
export function toIcs(session: Session, now = new Date()): string {
  const end = endOf(session);
  const description = [
    `${typeLabel(session.type)} · ${fmtKm(session.route.distance)} · ${fmtPace(session.paceSec)} /km`,
    session.route.ascent != null ? `${session.route.ascent} hoogtemeters` : '',
    session.notes,
  ]
    .filter(Boolean)
    .join('\n');
  const location = [session.place.name, session.place.detail].filter(Boolean).join(', ');
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Run//Hardloopplanner//NL',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${session.id}@run-planner`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${stamp(session.date, session.time)}`,
    `DTEND:${stamp(end.date, end.time)}`,
    `SUMMARY:${icsText(`🏃 ${session.title}`)}`,
    `LOCATION:${icsText(location)}`,
    `GEO:${session.place.lat.toFixed(6)};${session.place.lng.toFixed(6)}`,
    `DESCRIPTION:${icsText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Hardloopsessie',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n')
    .concat('\r\n');
}

export function fileSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'run'
  );
}

/** Deelt een bestand via het iOS-deelmenu als dat kan, en downloadt het anders. */
export async function shareFile(filename: string, mime: string, content: string): Promise<void> {
  const file = new File([content], filename, { type: mime });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // gebruiker sloot het deelmenu
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
