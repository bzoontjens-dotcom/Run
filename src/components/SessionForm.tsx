import { useState } from 'react';
import { addDays, fmtDuration, fmtKm, fmtLongDate, fmtPace, todayStr } from '../lib/format';
import { flag } from '../lib/geocode';
import { newId, setPrefs, usePrefs } from '../lib/store';
import { SESSION_TYPES, type Session, type SessionType } from '../lib/types';
import type { Draft } from './PlanScreen';
import RouteThumb from './RouteThumb';
import { CloseIcon } from './icons';

interface Props {
  /** Nieuwe sessie op basis van een geplande route… */
  draft?: Draft;
  /** …of een bestaande sessie om te bewerken. */
  session?: Session;
  onSave: (session: Session) => void;
  onClose: () => void;
}

const MIN_PACE = 180; // 3:00 /km
const MAX_PACE = 540; // 9:00 /km

export default function SessionForm({ draft, session, onSave, onClose }: Props) {
  const prefs = usePrefs();
  const source = session ?? draft!;
  const today = todayStr();

  const [title, setTitle] = useState(source.title);
  const [date, setDate] = useState(session?.date ?? addDays(today, 1));
  const [time, setTime] = useState(session?.time ?? '08:00');
  const [type, setType] = useState<SessionType>(session?.type ?? 'easy');
  const [paceSec, setPaceSec] = useState(session?.paceSec ?? prefs.paceSec);
  const [notes, setNotes] = useState(session?.notes ?? '');

  const { place, route } = source;
  const duration = (route.distance / 1000) * paceSec;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    setPrefs({ paceSec });
    onSave({
      id: session?.id ?? newId(),
      title: title.trim() || source.title,
      date,
      time,
      type,
      paceSec,
      notes: notes.trim(),
      place,
      route,
      done: session?.done ?? false,
      createdAt: session?.createdAt ?? Date.now(),
    });
  };

  return (
    <div className="sheet-backdrop">
      <form className="sheet" onSubmit={submit} aria-label={session ? 'Sessie bewerken' : 'Sessie plannen'}>
        <header className="sheet-head">
          <button type="button" className="icon-btn" aria-label="Sluiten" onClick={onClose}>
            <CloseIcon width={18} height={18} />
          </button>
          <h2>{session ? 'Sessie bewerken' : 'Run plannen'}</h2>
          <button type="submit" className="link-btn">
            Bewaar
          </button>
        </header>

        <div className="sheet-body">
          <div className="summary">
            <RouteThumb coords={route.coords} size={72} />
            <div>
              <strong>{fmtKm(route.distance)}</strong>
              <span>
                {flag(place.countryCode)} {place.name}
              </span>
              {route.ascent != null && <small>{route.ascent} m klimmen</small>}
            </div>
          </div>

          <label className="field">
            <span>Naam</span>
            <input
              type="text"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={source.title}
            />
          </label>

          <div className="field">
            <span id="when-label">Wanneer</span>
            <div className="quick" role="group" aria-labelledby="when-label">
              {[
                ['Vandaag', today],
                ['Morgen', addDays(today, 1)],
                ['Overmorgen', addDays(today, 2)],
              ].map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={date === value}
                  onClick={() => setDate(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="field-row">
              <input
                type="date"
                aria-label="Datum"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                aria-label="Starttijd"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            {date && <small className="field-note">{fmtLongDate(date)}, plaatselijke tijd</small>}
          </div>

          <div className="field">
            <span id="type-label">Soort training</span>
            <div className="type-grid" role="radiogroup" aria-labelledby="type-label">
              {SESSION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={type === t.id}
                  className={`type-option type-${t.id}`}
                  onClick={() => setType(t.id)}
                >
                  <strong>{t.label}</strong>
                  <small>{t.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Tempo</span>
            <div className="pace">
              <output>
                {fmtPace(paceSec)} <small>/km</small>
              </output>
              <span className="pace-total">≈ {fmtDuration(duration)}</span>
            </div>
            <input
              type="range"
              min={MIN_PACE}
              max={MAX_PACE}
              step={5}
              value={paceSec}
              aria-label="Tempo in seconden per kilometer"
              aria-valuetext={`${fmtPace(paceSec)} per kilometer`}
              // Links langzaam, rechts snel: de schuif loopt daarom in spiegelbeeld.
              style={{ direction: 'rtl' }}
              onChange={(e) => setPaceSec(Number(e.target.value))}
            />
            <div className="pace-scale" aria-hidden="true">
              <span>rustig</span>
              <span>snel</span>
            </div>
          </label>

          <label className="field">
            <span>Notities</span>
            <textarea
              rows={3}
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bijv. 6 × 800 m, of met wie je loopt"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block">
            {session ? 'Wijzigingen bewaren' : 'Zet in mijn agenda'}
          </button>
        </div>
      </form>
    </div>
  );
}
