import { useEffect, useState } from 'react';
import AgendaScreen from './components/AgendaScreen';
import PlanScreen, { type Draft } from './components/PlanScreen';
import SessionDetail from './components/SessionDetail';
import SessionForm from './components/SessionForm';
import { CalendarIcon, MapIcon } from './components/icons';
import { todayStr } from './lib/format';
import { saveSession, useSessions } from './lib/store';
import type { Session } from './lib/types';

type Tab = 'plan' | 'agenda';

export default function App() {
  const sessions = useSessions();
  const [tab, setTab] = useState<Tab>('plan');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const open = sessions.find((s) => s.id === openId) ?? null;
  const today = todayStr();
  const upcomingCount = sessions.filter((s) => !s.done && s.date >= today).length;

  const save = (session: Session) => {
    const stored = saveSession(session);
    setDraft(null);
    setEditing(false);
    if (!open) setTab('agenda');
    setToast(stored ? 'Run staat in je agenda' : 'Opslag is vol: de run blijft alleen staan tot je de app sluit');
  };

  return (
    <div className="app">
      <main className="screens">
        <div className="screen" hidden={tab !== 'plan'}>
          <PlanScreen onPlan={setDraft} onToast={setToast} />
        </div>
        {tab === 'agenda' && (
          <div className="screen screen-scroll">
            <AgendaScreen onOpen={setOpenId} onPlanNew={() => setTab('plan')} />
          </div>
        )}
      </main>

      <nav className="tabbar" aria-label="Hoofdmenu">
        <button type="button" aria-current={tab === 'plan' ? 'page' : undefined} onClick={() => setTab('plan')}>
          <MapIcon />
          <span>Plannen</span>
        </button>
        <button type="button" aria-current={tab === 'agenda' ? 'page' : undefined} onClick={() => setTab('agenda')}>
          <span className="tab-icon">
            <CalendarIcon />
            {upcomingCount > 0 && <em aria-label={`${upcomingCount} gepland`}>{upcomingCount}</em>}
          </span>
          <span>Agenda</span>
        </button>
      </nav>

      {open && (
        <SessionDetail
          session={open}
          onBack={() => setOpenId(null)}
          onEdit={() => setEditing(true)}
          onToast={setToast}
        />
      )}
      {draft && <SessionForm draft={draft} onSave={save} onClose={() => setDraft(null)} />}
      {open && editing && <SessionForm session={open} onSave={save} onClose={() => setEditing(false)} />}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
