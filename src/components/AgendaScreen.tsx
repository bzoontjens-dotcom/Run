import { useEffect, useState } from 'react';
import { durationSec } from '../lib/export';
import { agendaGroup, fmtDay, fmtDuration, fmtKm, todayStr } from '../lib/format';
import { flag } from '../lib/geocode';
import { byStart, useSessions } from '../lib/store';
import { typeLabel, type Session } from '../lib/types';
import { describeWeather, getForecast, type Forecast } from '../lib/weather';
import RouteThumb from './RouteThumb';
import { CheckIcon, PlusIcon } from './icons';

interface Props {
  onOpen: (id: string) => void;
  onPlanNew: () => void;
}

export function useForecast(session: Session): Forecast | null {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const { lat, lng } = session.place;
  useEffect(() => {
    let alive = true;
    setForecast(null);
    getForecast(lat, lng, session.date, session.time).then((f) => {
      if (alive) setForecast(f);
    });
    return () => {
      alive = false;
    };
  }, [lat, lng, session.date, session.time]);
  return forecast;
}

function SessionCard({ session, past, onOpen }: { session: Session; past: boolean; onOpen: () => void }) {
  const forecast = useForecast(session);
  const weather = forecast && !past ? describeWeather(forecast.code) : null;
  return (
    <li>
      <button type="button" className={`card${past ? ' is-past' : ''}`} onClick={onOpen}>
        <RouteThumb coords={session.route.coords} />
        <span className="card-main">
          <span className="card-when">
            {fmtDay(session.date)} · {session.time}
          </span>
          <strong className="card-title">{session.title}</strong>
          <span className="card-meta">
            {fmtKm(session.route.distance)} · ± {fmtDuration(durationSec(session))} · {flag(session.place.countryCode)}{' '}
            {session.place.name}
          </span>
          <span className={`badge type-${session.type}`}>{typeLabel(session.type)}</span>
        </span>
        <span className="card-side">
          {session.done ? (
            <span className="done-mark" aria-label="Afgerond">
              <CheckIcon width={16} height={16} />
            </span>
          ) : (
            weather && (
              <span className="card-weather" aria-label={`${weather.label}, ${forecast!.tempC} graden`}>
                <span aria-hidden="true">{weather.icon}</span>
                {forecast!.tempC}°
              </span>
            )
          )}
        </span>
      </button>
    </li>
  );
}

export default function AgendaScreen({ onOpen, onPlanNew }: Props) {
  const sessions = useSessions();
  const today = todayStr();

  const upcoming = sessions.filter((s) => !s.done && s.date >= today).sort(byStart);
  const past = sessions.filter((s) => s.done || s.date < today).sort((a, b) => byStart(b, a));

  const groups: { title: string; items: Session[] }[] = [];
  for (const s of upcoming) {
    const title = agendaGroup(s.date);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.items.push(s);
    else groups.push({ title, items: [s] });
  }

  const plannedKm = upcoming.reduce((sum, s) => sum + s.route.distance, 0);
  const countries = new Set(upcoming.map((s) => s.place.countryCode).filter(Boolean));

  return (
    <section className="agenda" aria-label="Agenda">
      <header className="agenda-head">
        <div>
          <h1>Agenda</h1>
          <p>
            {upcoming.length === 0
              ? 'Nog niets gepland'
              : `${upcoming.length} ${upcoming.length === 1 ? 'run' : 'runs'} · ${fmtKm(plannedKm)}` +
                (countries.size > 1 ? ` · ${countries.size} landen` : '')}
          </p>
        </div>
        <button type="button" className="round-btn round-btn-accent" aria-label="Nieuwe run plannen" onClick={onPlanNew}>
          <PlusIcon />
        </button>
      </header>

      {sessions.length === 0 && (
        <div className="empty">
          <svg viewBox="0 0 120 80" width="150" height="100" aria-hidden="true">
            <path
              d="M12 62c14-30 26 8 40-14s18-30 30-18 4 30 26 22"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              className="empty-line"
            />
            <circle cx="12" cy="62" r="6" className="empty-dot" />
          </svg>
          <h2>Je agenda is nog leeg</h2>
          <p>Kies een plek in Europa, laat een rondje maken en zet het in je agenda.</p>
          <button type="button" className="btn btn-primary" onClick={onPlanNew}>
            Plan je eerste run
          </button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.title} className="group">
          <h2>{group.title}</h2>
          <ul>
            {group.items.map((s) => (
              <SessionCard key={s.id} session={s} past={false} onOpen={() => onOpen(s.id)} />
            ))}
          </ul>
        </div>
      ))}

      {past.length > 0 && (
        <div className="group">
          <h2>Geweest</h2>
          <ul>
            {past.map((s) => (
              <SessionCard key={s.id} session={s} past onOpen={() => onOpen(s.id)} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
