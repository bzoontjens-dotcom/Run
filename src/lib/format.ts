import { daysUntil } from './weather';

const nl = (n: number, digits: number) =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "10,2" voor 10 240 meter; onder de 10 km met twee cijfers achter de komma. */
export function kmNumber(meters: number): string {
  const km = meters / 1000;
  return nl(km, km < 10 ? 2 : 1);
}

export function fmtKm(meters: number): string {
  return `${kmNumber(meters)} km`;
}

/** "52 min" of "1 u 05". */
export function fmtDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} u ${String(mins % 60).padStart(2, '0')}`;
}

/** "5:30" voor 330 seconden per kilometer. */
export function fmtPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "za 21 nov", met jaartal als het niet dit jaar is. */
export function fmtDate(date: string, now = new Date()): string {
  const d = parseDate(date);
  return d.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** "Vandaag", "Morgen" of de datum. */
export function fmtDay(date: string, now = new Date()): string {
  const days = daysUntil(date, now);
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  if (days === -1) return 'Gisteren';
  return fmtDate(date, now);
}

export function fmtLongDate(date: string): string {
  return parseDate(date).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Vandaag als JJJJ-MM-DD in lokale tijd. */
export function todayStr(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

/** Groepstitel voor de agenda: deze week, volgende week, of de maand. */
export function agendaGroup(date: string, now = new Date()): string {
  const days = daysUntil(date, now);
  // Maandag als eerste dag van de week.
  const weekday = (now.getDay() + 6) % 7;
  const untilSunday = 6 - weekday;
  if (days <= untilSunday) return 'Deze week';
  if (days <= untilSunday + 7) return 'Volgende week';
  const label = parseDate(date).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
