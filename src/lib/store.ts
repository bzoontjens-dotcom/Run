import { useSyncExternalStore } from 'react';
import type { Session } from './types';

const SESSIONS_KEY = 'run.sessions.v1';
const PREFS_KEY = 'run.prefs.v1';

export interface Prefs {
  /** Laatst gebruikte tempo in seconden per kilometer. */
  paceSec: number;
  /** Laatst gekozen lengte van een rondje in kilometers. */
  loopKm: number;
}

const DEFAULT_PREFS: Prefs = { paceSec: 360, loopKm: 8 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // opslag vol of geblokkeerd; de sessie blijft wel in het geheugen staan
  }
}

let sessions: Session[] = read<Session[]>(SESSIONS_KEY, []);
let prefs: Prefs = { ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS_KEY, {}) };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessions(): Session[] {
  return useSyncExternalStore(subscribe, () => sessions);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => prefs);
}

export function saveSession(session: Session): boolean {
  const exists = sessions.some((s) => s.id === session.id);
  sessions = exists ? sessions.map((s) => (s.id === session.id ? session : s)) : [...sessions, session];
  const ok = write(SESSIONS_KEY, sessions);
  emit();
  return ok;
}

export function deleteSession(id: string) {
  sessions = sessions.filter((s) => s.id !== id);
  write(SESSIONS_KEY, sessions);
  emit();
}

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  write(PREFS_KEY, prefs);
  emit();
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Sorteert op datum en starttijd, vroegste eerst. */
export function byStart(a: Session, b: Session): number {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
}
