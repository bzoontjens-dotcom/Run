import { useEffect, useRef, useState } from 'react';
import { matchCities } from '../lib/cities';
import { flag, searchPlaces } from '../lib/geocode';
import type { Place } from '../lib/types';
import { CloseIcon, SearchIcon } from './icons';

const AREA_KINDS = new Set(['city', 'county', 'state', 'district']);

/**
 * Bekende steden eerst, daarna de zoekresultaten. Een resultaat dat dezelfde stad is
 * als een bekende stad valt weg, en van gelijknamige resultaten blijft er één over
 * (bij voorkeur de stad zelf, niet het omliggende gebied).
 */
export function mergeResults(cities: Place[], remote: Place[], limit = 7): Place[] {
  const unique = new Map<string, Place>();
  for (const r of remote) {
    const isKnownCity =
      AREA_KINDS.has(r.kind ?? '') &&
      cities.some((c) => Math.abs(c.lat - r.lat) < 0.15 && Math.abs(c.lng - r.lng) < 0.25);
    if (isKnownCity) continue;
    const key = `${r.name}|${r.detail}`;
    const seen = unique.get(key);
    if (!seen || (seen.kind !== 'city' && r.kind === 'city')) unique.set(key, r);
  }
  return [...cities, ...unique.values()].slice(0, limit);
}

interface Props {
  onPick: (place: Place) => void;
}

export default function SearchBar({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const cities = matchCities(q);

  useEffect(() => {
    setFailed(false);
    if (q.length < 2) {
      setRemote([]);
      setBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    // Even wachten tot er niet meer getypt wordt, zodat de zoekdienst niet bij elke toets wordt aangeroepen.
    const timer = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then((places) => {
          setRemote(places);
          setBusy(false);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setRemote([]);
          setFailed(true);
          setBusy(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const results = mergeResults(cities, remote);

  const pick = (place: Place) => {
    setQuery('');
    setOpen(false);
    input.current?.blur();
    onPick(place);
  };

  const showList = open && q.length > 0;

  return (
    <div className="search">
      <form
        className="search-field"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) pick(results[0]);
        }}
      >
        <SearchIcon className="search-icon" />
        <input
          ref={input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Zoek een stad, park of adres"
          aria-label="Zoek een plek in Europa"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label="Zoekveld leegmaken"
            onClick={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </form>
      {showList && (
        <ul className="search-results" role="listbox" aria-label="Zoekresultaten">
          {results.map((place, i) => (
            <li key={`${place.lat},${place.lng},${i}`} role="option" aria-selected={false}>
              <button type="button" onClick={() => pick(place)}>
                <span className="result-flag" aria-hidden="true">
                  {flag(place.countryCode) || '📍'}
                </span>
                <span className="result-text">
                  <strong>{place.name}</strong>
                  {place.detail && <small>{place.detail}</small>}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="search-empty">
              {busy ? 'Zoeken…' : failed ? 'Zoeken lukt nu niet. Controleer je internet.' : 'Niets gevonden in Europa.'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
