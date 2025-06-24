import React, { useState, useEffect, useMemo } from 'react';
import type FullCalendar from '@fullcalendar/react';
import type { Role } from './Calendar';

interface CalendarToolbarProps {
  view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  setView: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
  calendarRef: React.RefObject<FullCalendar | null>;
  isTodayInView: boolean;
  calendarTitle: string;
  role?: Role;
  onAddClick?: () => void;      // for admin
  onProposeClick: () => void;  // for intervenant
  moduleOptions: { id_module: number; nommodule: string; type_module: 'majeur' | 'mineur' }[];
  filterModules: string[];                    // ex: "1-majeur"
  setFilterModules: (ids: string[]) => void;
  parcoursFilter: string[];
  setParcoursFilter: (p: string[]) => void;
  filterMyCourses?: boolean;
  setFilterMyCourses?: (val: boolean) => void;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  view,
  setView,
  calendarRef,
  isTodayInView,
  calendarTitle,
  role,
  onAddClick,
  onProposeClick,
  moduleOptions,
  filterModules,
  setFilterModules,
  parcoursFilter,
  setParcoursFilter,
  filterMyCourses,
  setFilterMyCourses,
}) => {
  const api = calendarRef.current?.getApi();

  // Dé‑duplique les modules (clé = id_module + type_module)
  const uniqueModuleOptions = useMemo(
    () =>
      Array.from(
        new Map(
          moduleOptions.map(o => [`${o.id_module}-${o.type_module}`, o])
        ).values()
      ),
    [moduleOptions]
  );

  // State and updater for current clock display
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [showFilter, setShowFilter] = useState(false);

  const goPrev = () => api?.prev();
  const goNext = () => api?.next();
  const goToday = () => api?.today();

  const goDay = () => {
    api?.changeView('timeGridDay');
    setView('timeGridDay');
  };
  const goWeek = () => {
    api?.changeView('timeGridWeek');
    setView('timeGridWeek');
  };
  const goMonth = () => {
    api?.changeView('dayGridMonth');
    setView('dayGridMonth');
  };

  return (
    <div className="calendar__nav">
      <div className="calendar__nav-label">
        {calendarTitle}
        <span className="calendar__current-time">{currentTime}</span>
      </div>
      <div className="calendar__nav-buttons">
        <button onClick={goPrev} aria-label="Précédent">←</button>
        <button onClick={goToday} className={isTodayInView ? 'active' : ''}>Aujourd’hui</button>
        <button onClick={goNext} aria-label="Suivant">→</button>
        <button className={view === 'timeGridDay' ? 'active' : ''} onClick={goDay}>Jour</button>
        <button className={view === 'timeGridWeek' ? 'active' : ''} onClick={goWeek}>Semaine</button>
        <button className={view === 'dayGridMonth' ? 'active' : ''} onClick={goMonth}>Mois</button>
        {role === 'admin' && (
          <button
            className="calendar__create-btn"
            onClick={onAddClick}
          >
            Ajouter
          </button>
        )}
        {role === 'intervenant' && (
          <button
            className="calendar__create-btn"
            onClick={onProposeClick}
          >
            Proposer
          </button>
        )}
        {(role === 'admin' || role === 'intervenant') && (
          <button
            type="button"
            className="module-filter-btn"
            onClick={() => setShowFilter(!showFilter)}
          >
            Filtrer
          </button>
        )}
      </div>
      {showFilter && (role === 'admin' || role === 'intervenant') && (
        <div className="module-filter-dropdown">
          <div className="module-filter-group">
            <div className="module-filter-group-title">Majeur</div>
            {uniqueModuleOptions.filter(m => m.type_module === 'majeur')
              .map(m => {
                const key = `${m.id_module}-${m.type_module}`;
                return (
                  <label key={key} className="module-filter-option">
                    {m.nommodule}
                    <input
                      type="checkbox"
                      value={key}
                      checked={filterModules.includes(key)}
                      onChange={() => {
                        if (filterModules.includes(key)) {
                          setFilterModules(filterModules.filter(k => k !== key));
                        } else {
                          setFilterModules([...filterModules, key]);
                        }
                      }}
                    />
                  </label>
                );
              })}
          </div>
          <div className="module-filter-group">
            <div className="module-filter-group-title">Mineur</div>
            {uniqueModuleOptions.filter(m => m.type_module === 'mineur')
              .map(m => {
                const key = `${m.id_module}-${m.type_module}`;
                return (
                  <label key={key} className="module-filter-option">
                    {m.nommodule}
                    <input
                      type="checkbox"
                      value={key}
                      checked={filterModules.includes(key)}
                      onChange={() => {
                        if (filterModules.includes(key)) {
                          setFilterModules(filterModules.filter(k => k !== key));
                        } else {
                          setFilterModules([...filterModules, key]);
                        }
                      }}
                    />
                  </label>
                );
              })}
          </div>
          <div className="module-filter-group">
            <div className="module-filter-group-title">Parcours</div>
            {['Apprenti', 'Intégré'].map(p => (
              <label key={p} className="module-filter-option">
                {p}
                <input
                  type="checkbox"
                  value={p}
                  checked={parcoursFilter.includes(p)}
                  onChange={() => {
                    if (parcoursFilter.includes(p)) {
                      setParcoursFilter(parcoursFilter.filter(x => x !== p));
                    } else {
                      setParcoursFilter([...parcoursFilter, p]);
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {role === 'intervenant' && setFilterMyCourses && (
            <div className="module-filter-group">
              <div className="module-filter-group-title">Mes cours</div>
              <label className="module-filter-option">
                Mes cours
                <input
                  type="checkbox"
                  checked={filterMyCourses}
                  onChange={() => setFilterMyCourses(!filterMyCourses)}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarToolbar;