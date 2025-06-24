import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../../AuthProvider';
import { useFetchEvents } from './useFetchEvents';
import { useModalHandlers } from './useModalHandlers';
import type { DateClickArg } from './useModalHandlers';
import CalendarToolbar from './CalendarToolbar';
import CalendarSidebar from './CalendarSidebar';
import EventRenderer from './EventRenderer';
import Modal from '../Modal/Modal';
import './Calendar.css';

export type Role = 'admin' | 'intervenant' | 'eleve';

interface CalendarProps {
  role?: Role;
}

const Calendar: React.FC<CalendarProps> = ({ role }) => {
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [todayInView, setTodayInView] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState<string>('');

  const { events, refreshEvents, intervenantOptions, moduleOptions, rawModuleOptions, formModuleOptions, salleOptions, referentOptions, currentIntervenantId } = useFetchEvents(user);
  // Admin-only: modules à filtrer
  const [filterModules, setFilterModules] = useState<string[]>([]);
  // Admin-only: parcours à filtrer
  const [filterParcours, setFilterParcours] = useState<string[]>([]);
  // Intervenant-only filter: show only my courses
  const [filterMyCourses, setFilterMyCourses] = useState<boolean>(false);

  // Appliquer filtres modules, parcours et "mes cours"
  let displayed = events;

  // Filtre par module (admin et intervenant)
  if ((role === 'admin' || role === 'intervenant') && filterModules.length > 0) {
    displayed = displayed.filter(evt => {
      const isHoliday = evt.classNames?.includes('holiday-event');
      if (isHoliday) return true;
      const mods = (evt.extendedProps?.modules as { id_module: number; type_module: 'majeur' | 'mineur' }[]) || [];
      return mods.some(m => filterModules.includes(`${m.id_module}-${m.type_module}`));
    });
  }

  // Filtre par parcours (admin et intervenant)
  if ((role === 'admin' || role === 'intervenant') && filterParcours.length > 0) {
    displayed = displayed.filter(evt => {
      const isHoliday = evt.classNames?.includes('holiday-event');
      if (isHoliday) return true;
      const pc = evt.extendedProps?.parcours as string;
      return pc === 'Tous' || filterParcours.includes(pc);
    });
  }

  // Filtre "mes cours" (intervenant seulement)
  if (role === 'intervenant' && filterMyCourses && currentIntervenantId != null) {
    displayed = displayed.filter(evt => {
      const ids = (evt.extendedProps?.intervenantIds as number[]) || [];
      return ids.includes(currentIntervenantId);
    });
  }

  const displayedEvents = displayed;

  const {
    sidebarEvents,
    modalAddProps,
    modalEditProps,
    modalProposeProps,
    handleDateClick,
    handleEventClick,
    handleProposeClick,
    handleDatesSet,
  } = useModalHandlers({
    role,
    calendarRef,
    events,
    refreshEvents,
    intervenantOptions,
    moduleOptions: formModuleOptions,
    salleOptions,
    referentOptions,
  });

  const offsetHours = -new Date().getTimezoneOffset() / 60;
  const tzLabel = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;

  return (
    <div className="calendar">
      <div className="calendar__body">
        <aside className="calendar__sidebar">
          <CalendarSidebar events={sidebarEvents} calendarRef={calendarRef} />
        </aside>
        <div className="calendar__display">
          <CalendarToolbar
            view={view}
            setView={setView}
            calendarRef={calendarRef}
            isTodayInView={todayInView}
            calendarTitle={calendarTitle}
            role={role}
            onAddClick={() => {
              // centre de l'écran
              const evt = new MouseEvent('click', {
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2,
              });
              handleDateClick({ date: new Date(), jsEvent: evt } as DateClickArg);
            }}
            onProposeClick={handleProposeClick}
            moduleOptions={role === 'admin' ? rawModuleOptions : moduleOptions}
            filterModules={filterModules}
            setFilterModules={setFilterModules}
            parcoursFilter={filterParcours}
            setParcoursFilter={setFilterParcours}
            filterMyCourses={filterMyCourses}
            setFilterMyCourses={setFilterMyCourses}
          />
          <section className="calendar__main">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              headerToolbar={false}
              locale="fr"
              timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              scrollTime="06:00:00"
              events={displayedEvents}
              dateClick={info => {
                handleDateClick(info);
              }}
              eventClick={info => {
                const ev = info.event;
                // Skip if this is a celebration (no typecours)
                if (!ev.extendedProps.typecours) return;
                handleEventClick(info);
              }}
              eventContent={(arg) => <EventRenderer arg={arg} />}
              eventDidMount={EventRenderer.handleDidMount}
              nowIndicator={true}
              slotDuration="00:30:00"
              slotLabelInterval={{ hours: 1 }}
              slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              allDaySlot
              allDayText={tzLabel}
              datesSet={(info) => {
                handleDatesSet(info);
                setCalendarTitle(info.view.title);
                const now = new Date();
                setTodayInView(now >= info.start && now < info.end);
              }}
            />
            {modalAddProps && (
              <Modal
                {...modalAddProps}
              />
            )}
            {modalEditProps && (
              <Modal
                {...modalEditProps}
              />
            )}
            {modalProposeProps && <Modal {...modalProposeProps} />}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Calendar;