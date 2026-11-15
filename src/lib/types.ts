/** Coördinaat als [breedtegraad, lengtegraad]. */
export type LatLng = [number, number];

export interface Place {
  name: string;
  /** Extra regel, bv. "Noord-Holland, Nederland". */
  detail: string;
  country?: string;
  countryCode?: string;
  /** Soort plek volgens de zoekdienst, bv. "city" of "street". */
  kind?: string;
  lat: number;
  lng: number;
}

export type SessionType = 'easy' | 'long' | 'tempo' | 'interval' | 'recovery' | 'race';

export interface Route {
  coords: LatLng[];
  /** Afstand in meters. */
  distance: number;
  /** Totaal aantal hoogtemeters omhoog; null als onbekend. */
  ascent: number | null;
  /** Hoogteprofiel (meters), gelijkmatig verdeeld over de route. */
  profile: number[];
}

export interface Session {
  id: string;
  title: string;
  /** Lokale datum op de plek van de run, JJJJ-MM-DD. */
  date: string;
  /** Lokale starttijd, UU:MM. */
  time: string;
  type: SessionType;
  /** Beoogd tempo in seconden per kilometer. */
  paceSec: number;
  notes: string;
  place: Place;
  route: Route;
  done: boolean;
  createdAt: number;
}

export const SESSION_TYPES: { id: SessionType; label: string; hint: string }[] = [
  { id: 'easy', label: 'Duurloop', hint: 'Rustig, praattempo' },
  { id: 'long', label: 'Lange duurloop', hint: 'Lang en ontspannen' },
  { id: 'tempo', label: 'Tempo', hint: 'Stevig doorlopen' },
  { id: 'interval', label: 'Interval', hint: 'Snelle blokken met rust' },
  { id: 'recovery', label: 'Herstel', hint: 'Heel rustig, kort' },
  { id: 'race', label: 'Wedstrijd', hint: 'Alles geven' },
];

export function typeLabel(type: SessionType): string {
  return SESSION_TYPES.find((t) => t.id === type)?.label ?? type;
}
