import { useEffect, useState } from 'react';
import { durationSec, fileSlug, shareFile, toGpx, toIcs } from '../lib/export';
import { fmtDuration, fmtKm, fmtLongDate, fmtPace } from '../lib/format';
import { sampleAlong, totalAscent } from '../lib/geo';
import { flag } from '../lib/geocode';
import { deleteSession, saveSession } from '../lib/store';
import { typeLabel, type Session } from '../lib/types';
import { daysUntil, describeWeather, getElevations } from '../lib/weather';
import { useForecast } from './AgendaScreen';
import MapView from './MapView';
import { CalendarIcon, CheckIcon, ChevronLeftIcon, PencilIcon, ShareIcon, TrashIcon } from './icons';

interface Props {
  session: Session;
  onBack: () => void;
  onEdit: () => void;
  onToast: (message: string) => void;
}

function Profile({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 20); // vlakke routes niet opblazen tot bergen
  const w = 300;
  const h = 56;
  const points = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 4 - ((v - min) / range) * (h - 10)).toFixed(1)}`);
  return (
    <figure className="profile">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Hoogteprofiel van ${Math.round(min)} tot ${Math.round(max)} meter`}>
        <path d={`M0 ${h} L${points.join(' L')} L${w} ${h} Z`} className="profile-area" />
        <path d={`M${points.join(' L')}`} className="profile-line" />
      </svg>
      <figcaption>
        <span>laagste punt {Math.round(min)} m</span>
        <span>hoogste punt {Math.round(max)} m</span>
      </figcaption>
    </figure>
  );
}

export default function SessionDetail({ session, onBack, onEdit, onToast }: Props) {
  const forecast = useForecast(session);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { route, place } = session;
  const days = daysUntil(session.date);

  // Hoogtemeters alsnog ophalen als ze bij het plannen nog niet bekend waren.
  useEffect(() => {
    if (route.ascent != null || route.coords.length < 2) return;
    const ctrl = new AbortController();
    getElevations(sampleAlong(route.coords, 80), ctrl.signal)
      .then((profile) =>
        saveSession({ ...session, route: { ...route, ascent: totalAscent(profile), profile: profile.map(Math.round) } }),
      )
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const weather = forecast ? describeWeather(forecast.code) : null;
  const slug = fileSlug(session.title);

  return (
    <div className="detail" role="dialog" aria-label={session.title}>
      <header className="detail-head">
        <button type="button" className="round-btn" aria-label="Terug naar agenda" onClick={onBack}>
          <ChevronLeftIcon />
        </button>
        <button type="button" className="round-btn" aria-label="Bewerken" onClick={onEdit}>
          <PencilIcon width={20} height={20} />
        </button>
      </header>

      <div className="detail-map">
        <MapView start={route.coords[0] ?? [place.lat, place.lng]} route={route.coords} fitOnMount topInset={56} />
      </div>

      <div className="detail-body">
        <span className={`badge type-${session.type}`}>{typeLabel(session.type)}</span>
        <h1>{session.title}</h1>
        <p className="detail-when">
          {fmtLongDate(session.date)} · {session.time}
        </p>
        <p className="detail-where">
          {flag(place.countryCode)} {[place.name, place.detail].filter(Boolean).join(', ')}
        </p>

        <dl className="stats stats-4">
          <div>
            <dt>Afstand</dt>
            <dd>{fmtKm(route.distance)}</dd>
          </div>
          <div>
            <dt>Duur</dt>
            <dd>± {fmtDuration(durationSec(session))}</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>
              {fmtPace(session.paceSec)}
              <small> /km</small>
            </dd>
          </div>
          <div>
            <dt>Klimmen</dt>
            <dd>
              {route.ascent ?? '–'}
              <small> m</small>
            </dd>
          </div>
        </dl>

        {route.profile.length > 1 && <Profile values={route.profile} />}

        <div className="weather">
          {forecast && weather ? (
            <>
              <span className="weather-icon" aria-hidden="true">
                {weather.icon}
              </span>
              <div>
                <strong>
                  {forecast.tempC}° · {weather.label}
                </strong>
                <small>
                  {forecast.rainChance != null ? `${forecast.rainChance}% kans op regen · ` : ''}wind {forecast.windKmh} km/u
                </small>
              </div>
            </>
          ) : (
            <small>
              {days < 0
                ? 'Deze run ligt in het verleden.'
                : days > 14
                  ? `De weersverwachting verschijnt vanaf ${days - 14} ${days - 14 === 1 ? 'dag' : 'dagen'} van nu.`
                  : 'De weersverwachting is nu niet op te halen.'}
            </small>
          )}
        </div>

        {session.notes && (
          <div className="notes">
            <h2>Notities</h2>
            <p>{session.notes}</p>
          </div>
        )}

        <div className="detail-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => shareFile(`${slug}.ics`, 'text/calendar', toIcs(session))}
          >
            <CalendarIcon width={18} height={18} /> Zet in iPhone-agenda
          </button>
          <div className="btn-pair">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => shareFile(`${slug}.gpx`, 'application/gpx+xml', toGpx(session))}
            >
              <ShareIcon width={18} height={18} /> Route (GPX)
            </button>
            <a
              className="btn btn-quiet"
              href={`https://maps.apple.com/?daddr=${place.lat},${place.lng}&dirflg=w`}
              target="_blank"
              rel="noreferrer"
            >
              Naar de start
            </a>
          </div>
          <button
            type="button"
            className={`btn btn-quiet btn-block${session.done ? ' is-done' : ''}`}
            onClick={() => {
              saveSession({ ...session, done: !session.done });
              onToast(session.done ? 'Weer op gepland gezet' : 'Lekker gelopen! Afgevinkt.');
            }}
          >
            <CheckIcon width={18} height={18} /> {session.done ? 'Afgerond — ongedaan maken' : 'Markeer als gelopen'}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              deleteSession(session.id);
              onToast('Sessie verwijderd');
              onBack();
            }}
          >
            <TrashIcon width={18} height={18} /> {confirmDelete ? 'Tik nogmaals om te verwijderen' : 'Verwijderen'}
          </button>
        </div>
      </div>
    </div>
  );
}
