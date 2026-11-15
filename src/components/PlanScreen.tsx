import { useEffect, useRef, useState } from 'react';
import { FEATURED } from '../lib/cities';
import { fmtDuration, kmNumber } from '../lib/format';
import { inEurope, roundCoords, sampleAlong, simplify, totalAscent } from '../lib/geo';
import { flag, reverseGeocode } from '../lib/geocode';
import { generateLoop, routeVia, type RoutedPath } from '../lib/routing';
import { setPrefs, usePrefs } from '../lib/store';
import type { LatLng, Place, Route } from '../lib/types';
import { getElevations } from '../lib/weather';
import MapView, { type MapHandle } from './MapView';
import SearchBar from './SearchBar';
import { CloseIcon, LocateIcon, ShuffleIcon, TrashIcon, UndoIcon } from './icons';

export interface Draft {
  title: string;
  place: Place;
  route: Route;
}

interface Props {
  onPlan: (draft: Draft) => void;
  onToast: (message: string) => void;
}

type Mode = 'loop' | 'draw';

const MIN_KM = 2;
const MAX_KM = 45;

export default function PlanScreen({ onPlan, onToast }: Props) {
  const prefs = usePrefs();
  const map = useRef<MapHandle>(null);

  const [mode, setMode] = useState<Mode>('loop');
  const [start, setStart] = useState<LatLng | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loopKm, setLoopKm] = useState(prefs.loopKm);
  const [variant, setVariant] = useState(0);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [closed, setClosed] = useState(true);
  const [route, setRoute] = useState<RoutedPath | null>(null);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elevation, setElevation] = useState<{ ascent: number; profile: number[] } | null>(null);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [user, setUser] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  const chooseStart = (point: LatLng, known?: Place) => {
    setStart(point);
    setPlace(known ?? null);
    setPending(null);
    setVariant(0);
    setError(null);
  };

  const reset = () => {
    setStart(null);
    setPlace(null);
    setWaypoints([]);
    setRoute(null);
    setElevation(null);
    setPending(null);
    setError(null);
  };

  // Naam van de plek opzoeken als het startpunt op de kaart is gekozen.
  useEffect(() => {
    if (!start || (place && place.lat === start[0] && place.lng === start[1])) return;
    const ctrl = new AbortController();
    reverseGeocode(start, ctrl.signal)
      .then(setPlace)
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // Route berekenen zodra het startpunt, de afstand of de tussenpunten veranderen.
  useEffect(() => {
    if (!start || (mode === 'draw' && waypoints.length === 0)) {
      setRoute(null);
      setRouting(false);
      return;
    }
    const ctrl = new AbortController();
    setRouting(true);
    setError(null);
    // Korte pauze, zodat schuiven aan de afstand niet bij elke stap een route opvraagt.
    const timer = setTimeout(async () => {
      try {
        const result =
          mode === 'loop'
            ? await generateLoop(start, loopKm * 1000, variant, routeVia, ctrl.signal)
            : await routeVia([start, ...waypoints, ...(closed ? [start] : [])], ctrl.signal);
        setRoute(result);
        setRouting(false);
        if (mode === 'loop') map.current?.fit(result.coords);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setRoute(null);
        setRouting(false);
        setError((err as Error).message || 'De route kon niet worden berekend.');
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [mode, start, loopKm, variant, waypoints, closed]);

  // Hoogtemeters ophalen voor de berekende route.
  useEffect(() => {
    setElevation(null);
    if (!route || route.coords.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      getElevations(sampleAlong(route.coords, 80), ctrl.signal)
        .then((profile) => setElevation({ ascent: totalAscent(profile), profile }))
        .catch(() => {});
    }, 600);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [route]);

  const handleTap = (point: LatLng) => {
    if (!inEurope(point)) {
      onToast('Dit punt ligt buiten Europa.');
      return;
    }
    if (!start) chooseStart(point);
    else if (mode === 'loop') setPending(point);
    else setWaypoints((w) => [...w, point]);
  };

  const pickPlace = (p: Place) => {
    const point: LatLng = [p.lat, p.lng];
    setWaypoints([]);
    chooseStart(point, p);
    map.current?.flyTo(point, 14);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      onToast('Locatie wordt op dit apparaat niet ondersteund.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const point: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setUser(point);
        if (!inEurope(point)) {
          onToast('Je bent nu buiten Europa. Zoek een plek om te plannen.');
          return;
        }
        map.current?.flyTo(point, 15);
        if (!start) chooseStart(point);
        else setPending(point);
      },
      () => {
        setLocating(false);
        onToast('Je locatie is niet beschikbaar. Geef toestemming in Instellingen.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setPending(null);
    setRoute(null);
    setError(null);
  };

  const plan = () => {
    if (!start || !route) return;
    const where = place ?? { name: 'Gekozen punt', detail: '', lat: start[0], lng: start[1] };
    const isLoop = mode === 'loop' || closed;
    onPlan({
      title: `${isLoop ? 'Rondje' : 'Run'} ${where.name}`,
      place: where,
      route: {
        coords: roundCoords(simplify(route.coords, 4)),
        distance: Math.round(route.distance),
        ascent: elevation?.ascent ?? null,
        profile: elevation?.profile.map(Math.round) ?? [],
      },
    });
  };

  const seconds = route ? (route.distance / 1000) * prefs.paceSec : 0;

  return (
    <section className="plan" aria-label="Route plannen">
      <div className="map-wrap">
        <MapView
          ref={map}
          start={start}
          waypoints={mode === 'draw' ? waypoints : []}
          route={route?.coords ?? []}
          user={user}
          pending={pending}
          topInset={72}
          onTap={handleTap}
          onStartMove={(p) => chooseStart(p)}
        />
        <div className="map-top">
          <SearchBar onPick={pickPlace} />
          <button
            type="button"
            className={`round-btn${locating ? ' is-busy' : ''}`}
            aria-label="Naar mijn locatie"
            onClick={locate}
          >
            <LocateIcon />
          </button>
        </div>
        {pending && (
          <div className="map-pill" role="status">
            <button type="button" className="pill-main" onClick={() => chooseStart(pending)}>
              Start hier
            </button>
            <button type="button" className="pill-close" aria-label="Annuleren" onClick={() => setPending(null)}>
              <CloseIcon width={16} height={16} />
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        {!start ? (
          <>
            <h1 className="panel-title">Waar wil je lopen?</h1>
            <p className="panel-hint">Zoek een plek of tik op de kaart om je startpunt te kiezen.</p>
            <div className="chips" role="list" aria-label="Populaire steden">
              {FEATURED.map((city) => (
                <button key={city.name} type="button" role="listitem" className="chip" onClick={() => pickPlace(city)}>
                  <span aria-hidden="true">{flag(city.countryCode)}</span> {city.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="panel-head">
              <div className="panel-place">
                <strong>
                  {flag(place?.countryCode)} {place?.name ?? 'Startpunt…'}
                </strong>
                <small>{place?.detail || 'Sleep de speld om je start te verplaatsen'}</small>
              </div>
              <button type="button" className="icon-btn" aria-label="Opnieuw beginnen" onClick={reset}>
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            <div className="segmented" role="tablist" aria-label="Manier van plannen">
              <button type="button" role="tab" aria-selected={mode === 'loop'} onClick={() => changeMode('loop')}>
                Rondje op afstand
              </button>
              <button type="button" role="tab" aria-selected={mode === 'draw'} onClick={() => changeMode('draw')}>
                Zelf tekenen
              </button>
            </div>

            {mode === 'loop' ? (
              <label className="slider-row">
                <span className="slider-label">Ongeveer</span>
                <input
                  type="range"
                  min={MIN_KM}
                  max={MAX_KM}
                  step={1}
                  value={loopKm}
                  aria-label="Gewenste afstand in kilometers"
                  onChange={(e) => {
                    const km = Number(e.target.value);
                    setLoopKm(km);
                    setPrefs({ loopKm: km });
                  }}
                />
                <output className="slider-value">{loopKm} km</output>
              </label>
            ) : (
              <div className="draw-row">
                <p className="panel-hint">
                  {waypoints.length === 0
                    ? 'Tik op de kaart om punten langs je route te zetten.'
                    : `${waypoints.length} ${waypoints.length === 1 ? 'punt' : 'punten'} gezet`}
                </p>
                <label className="toggle">
                  <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
                  <span>Terug naar start</span>
                </label>
              </div>
            )}

            {error ? (
              <p className="panel-error" role="alert">
                {error}
              </p>
            ) : (
              <dl className={`stats${routing ? ' is-loading' : ''}`} aria-busy={routing}>
                <div>
                  <dt>Afstand</dt>
                  <dd>
                    {route ? kmNumber(route.distance) : '–'}
                    <small> km</small>
                  </dd>
                </div>
                <div>
                  <dt>Tijd</dt>
                  <dd>{route ? `± ${fmtDuration(seconds)}` : '–'}</dd>
                </div>
                <div>
                  <dt>Klimmen</dt>
                  <dd>
                    {route && elevation ? elevation.ascent : '–'}
                    <small> m</small>
                  </dd>
                </div>
              </dl>
            )}

            <div className="actions">
              {mode === 'loop' ? (
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setVariant((v) => v + 1)}
                  disabled={routing}
                >
                  <ShuffleIcon width={18} height={18} /> Ander rondje
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-quiet btn-square"
                    aria-label="Laatste punt ongedaan maken"
                    disabled={waypoints.length === 0}
                    onClick={() => setWaypoints((w) => w.slice(0, -1))}
                  >
                    <UndoIcon width={18} height={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-square"
                    aria-label="Alle punten wissen"
                    disabled={waypoints.length === 0}
                    onClick={() => setWaypoints([])}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </>
              )}
              <button type="button" className="btn btn-primary" disabled={!route || routing} onClick={plan}>
                Plan deze run
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
